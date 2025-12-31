// In Expo version 50, Android SDK level was set to 34, which introduces breaking changes.
const breakingChangeVersion = 50;

// In Expo version 52, onActivityResult with 3 parameters was deprecated.
const onActivityResultDeprecationVersion = 52;

export function setKotlinMainActivity(
  contents: string,
  sdkVersion: number
): string {
  let importLines = [
    'import com.adyenreactnativesdk.AdyenCheckout',
    'import android.content.Intent',
  ];

  if (sdkVersion >= onActivityResultDeprecationVersion) {
    importLines.push('import android.app.ComponentCaller');
  }

  // Filter out imports that are already present
  const uniqueImports = importLines.filter((line) => !contents.includes(line));

  // Join and prepare the import block
  const importBlock = uniqueImports.join('\n') + '\n';

  contents = contents.replace(
    /class\s+MainActivity\s*:\s*ReactActivity\s*\(/,
    (match) => `${importBlock}\n${match}`
  );

  // on Create
  contents = contents.replace(
    /super\.onCreate\(null\)/,
    (match) => `${match}\n    AdyenCheckout.setLauncherActivity(this)`
  );

  // on NewIntent
  const onNewIntentSignature =
    sdkVersion < breakingChangeVersion
      ? 'override fun onNewIntent(intent: Intent?) {'
      : 'override fun onNewIntent(intent: Intent) {';
  const onNewIntentMethod =
    sdkVersion < breakingChangeVersion
      ? 'intent?.let { AdyenCheckout.handleIntent(it) }'
      : 'AdyenCheckout.handleIntent(intent)';

  if (contents.includes(onNewIntentSignature)) {
    contents = contents.replace(
      /super\.onNewIntent\(intent\)\n/,
      (match) => `${match}    ${onNewIntentMethod}\n`
    );
  } else {
    contents = contents.replace(
      /}\n?$/,
      (match) =>
        `\n  ${onNewIntentSignature}\n    super.onNewIntent(intent)\n    ${onNewIntentMethod}\n  }\n${match}`
    );
  }

  // on ActivityResult
  const onActivityResultSignature =
    sdkVersion < onActivityResultDeprecationVersion
      ? 'override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {'
      : 'override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?, caller: ComponentCaller) {';
  const onActivityResultSuper =
    sdkVersion < onActivityResultDeprecationVersion
      ? 'super.onActivityResult(requestCode, resultCode, data)'
      : 'super.onActivityResult(requestCode, resultCode, data, caller)';

  const handleActivityResult =
    'AdyenCheckout.handleActivityResult(requestCode, resultCode, data)';

  if (contents.includes(onActivityResultSignature)) {
    contents = contents.replace(
      onActivityResultSuper,
      (match) => `${match}\n    ${handleActivityResult}\n`
    );
  } else {
    contents = contents.replace(
      /}\n?$/,
      (match) =>
        `\n  ${onActivityResultSignature}\n    ${onActivityResultSuper}\n    ${handleActivityResult}\n  }\n${match}`
    );
  }

  return contents;
}
