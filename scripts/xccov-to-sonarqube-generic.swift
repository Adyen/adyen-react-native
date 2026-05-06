#!/usr/bin/env swift
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

// Reads `xcrun xccov view --archive` output from stdin and writes SonarQube generic
// coverage XML to stdout, optionally filtering to files under --filter and making
// paths relative by stripping --strip.

// Example of input:
// adyen-react-native/ios/Views/PlatformView/ADYPlatformPayView.mm:
//   1: *
//   2: *
//   3: 0
//   4: 2
//   5: 0 [
//   (10, 0, 2)
//   ]
//   6: 0

import Foundation

// MARK: - Argument parsing

func fail(_ message: String, code: Int32 = 1) -> Never {
    fputs("\(message)\n", stderr)
    exit(code)
}

var cliArgs = Array(CommandLine.arguments.dropFirst())
var filterPrefix = ""
var stripPrefix = ""

while !cliArgs.isEmpty {
    let arg = cliArgs.removeFirst()
    switch arg {
    case "--filter":
        guard !cliArgs.isEmpty else { fail("Error: --filter requires an argument") }
        filterPrefix = cliArgs.removeFirst()
    case "--strip":
        guard !cliArgs.isEmpty else { fail("Error: --strip requires an argument") }
        stripPrefix = cliArgs.removeFirst()
    default:
        fail("Error: unexpected argument '\(arg)'")
    }
}

// MARK: - Convert xccov stdin to SonarQube generic XML

print(#"<?xml version="1.0"?>"#)
print(#"<coverage version="1">"#)

var currentPath: String?
var keep = false
var pendingLines: [String] = []

func flushFile() {
    defer { currentPath = nil; pendingLines = []; keep = false }
    guard let path = currentPath, keep, !pendingLines.isEmpty else { return }
    print("  <file path=\"\(path)\">")
    pendingLines.forEach { print($0) }
    print("  </file>")
}

while let line = readLine(strippingNewline: true) {
    if line.isEmpty {
        flushFile()
        continue
    }

    // File path lines end with ':' and have no leading whitespace
    if line.hasSuffix(":"), !line.hasPrefix(" ") {
        flushFile()
        let rawPath = String(line.dropLast())
        keep = filterPrefix.isEmpty || rawPath.contains(filterPrefix)
        var path = rawPath
        if keep, !stripPrefix.isEmpty, path.hasPrefix(stripPrefix) {
            path = String(path.dropFirst(stripPrefix.count))
        }
        currentPath = path
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "\"", with: "&quot;")
        continue
    }

    // Coverage lines format: "   N: <count>" where count is:
    //   *        — non-executable line (comment, blank, etc.)
    //   0        — executable, not covered → covered="false"
    //   12       — executable, covered → covered="true"
    //   0 [      — execution count > 0 → covered="flase"
    //   Branch coverage data lines like "(52, 0, 0)" and "]" are silently skipped
    let trimmed = line.trimmingCharacters(in: .whitespaces)
    guard let colon = trimmed.firstIndex(of: ":"),
          let lineNumber = Int(trimmed[trimmed.startIndex..<colon]) else {
        continue
    }
    
    // Take only the first token — branch data may follow (e.g. "0 [", "2 [")
    let countToken = trimmed[trimmed.index(after: colon)...]
        .trimmingCharacters(in: .whitespaces)
        .components(separatedBy: " ").first ?? ""
    if countToken == "0" {
        pendingLines.append("    <lineToCover lineNumber=\"\(lineNumber)\" covered=\"false\"/>")
    } else if countToken == "*" {
        continue
    } else if let first = countToken.first, first.isNumber {
        pendingLines.append("    <lineToCover lineNumber=\"\(lineNumber)\" covered=\"true\"/>")
    }
}

flushFile()

print("</coverage>")
