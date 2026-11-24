#!/usr/bin/env python3
# Copyright (c) 2026 Adyen N.V.

"""Applies one mitigation for the R8 / 3D Secure 2 release-build problem to a generated CI fixture.

Usage: apply_3ds2_mitigation.py <scenario> <android-dir>

Scenarios:
  baseline        no change (the fixture as generated)
  agp-upgrade     use Android Gradle plugin 9.4.1 and Gradle 9.6.0, which AGP 9.4 requires
                  (android/build.gradle, android/gradle/wrapper/gradle-wrapper.properties)
  pin-r8          pin R8 9.4.18 (android/settings.gradle)
  dontoptimize    add -dontoptimize (android/app/proguard-rules.pro)
  downgrade-3ds2  force adyen-3ds2 2.2.27 (android/app/build.gradle)
  old-r8-control  pin R8 8.7.18, which the library guard must reject
"""

import re
import sys
from pathlib import Path

AGP_VERSION = "9.4.1"
GRADLE_VERSION = "9.6.0"  # minimum Gradle of AGP 9.4
R8_VERSION = "9.4.18"
OLD_R8_VERSION = "8.7.18"
THREEDS2_VERSION = "2.2.27"

AGP_CLASSPATH = re.compile(
    r"""classpath\((['"])com\.android\.tools\.build:gradle(?::[^'"]*)?\1\)"""
)
GRADLE_DISTRIBUTION = re.compile(r"(distributionUrl=.*/)gradle-[^/\s]*-(?:bin|all)\.zip")
APP_DEPENDENCIES = re.compile(r"^dependencies\s*\{[ \t]*\n", re.MULTILINE)


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def read(path):
    if not path.is_file():
        fail(f"{path} not found")
    return path.read_text()


def agp_upgrade(android):
    path = android / "build.gradle"
    text, count = AGP_CLASSPATH.subn(
        f'classpath("com.android.tools.build:gradle:{AGP_VERSION}")', read(path)
    )
    if count == 0:
        fail(f"no com.android.tools.build:gradle classpath entry in {path}")
    path.write_text(text)
    print(f"{path}: Android Gradle plugin set to {AGP_VERSION}")

    wrapper = android / "gradle" / "wrapper" / "gradle-wrapper.properties"
    text, count = GRADLE_DISTRIBUTION.subn(
        rf"\g<1>gradle-{GRADLE_VERSION}-bin.zip", read(wrapper)
    )
    if count == 0:
        fail(f"no distributionUrl in {wrapper}")
    wrapper.write_text(text)
    print(f"{wrapper}: Gradle set to {GRADLE_VERSION}")


def end_of_plugin_management(text):
    """Index just after the line that closes the pluginManagement block."""
    start = text.find("pluginManagement")
    brace = text.find("{", start) if start >= 0 else -1
    if brace < 0:
        fail("no pluginManagement block in settings.gradle")
    depth = 0
    for index in range(brace, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                newline = text.find("\n", index)
                return len(text) if newline < 0 else newline + 1
    fail("unbalanced braces in the pluginManagement block of settings.gradle")


def pin_r8(android, version):
    path = android / "settings.gradle"
    text = read(path)
    if re.search(r"^buildscript\s*\{", text, re.MULTILINE):
        fail(f"{path} already has a buildscript block")
    block = (
        "\nbuildscript {\n"
        "    repositories {\n"
        "        google()\n"
        "        mavenCentral()\n"
        "    }\n"
        "    dependencies {\n"
        f'        classpath("com.android.tools:r8:{version}")\n'
        "    }\n"
        "}\n\n"
    )
    index = end_of_plugin_management(text)
    path.write_text(text[:index] + block + text[index:])
    print(f"{path}: R8 pinned to {version}")


def dontoptimize(android):
    path = android / "app" / "proguard-rules.pro"
    text = path.read_text() if path.is_file() else ""
    if text and not text.endswith("\n"):
        text += "\n"
    path.write_text(text + "-dontoptimize\n")
    print(f"{path}: added -dontoptimize")


def downgrade_3ds2(android):
    path = android / "app" / "build.gradle"
    text = read(path)
    match = APP_DEPENDENCIES.search(text)
    if not match:
        fail(f"no top-level dependencies block in {path}")
    dependency = (
        '    implementation("com.adyen.threeds:adyen-3ds2") {\n'
        f'        version {{ strictly "{THREEDS2_VERSION}" }}\n'
        "    }\n"
    )
    path.write_text(text[: match.end()] + dependency + text[match.end() :])
    print(f"{path}: adyen-3ds2 forced to {THREEDS2_VERSION}")


SCENARIOS = {
    "baseline": lambda android: print("baseline: fixture left as generated"),
    "agp-upgrade": agp_upgrade,
    "pin-r8": lambda android: pin_r8(android, R8_VERSION),
    "dontoptimize": dontoptimize,
    "downgrade-3ds2": downgrade_3ds2,
    "old-r8-control": lambda android: pin_r8(android, OLD_R8_VERSION),
}


def main(argv):
    if len(argv) != 3 or argv[1] not in SCENARIOS:
        fail(f"usage: {Path(argv[0]).name} <{'|'.join(SCENARIOS)}> <android-dir>")
    SCENARIOS[argv[1]](Path(argv[2]))


if __name__ == "__main__":
    main(sys.argv)
