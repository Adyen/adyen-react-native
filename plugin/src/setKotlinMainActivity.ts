export function setKotlinMainActivity(contents: string): string {
  contents = contents.replace(
    'class MainActivity : ReactActivity() {',
    'import com.adyenreactnativesdk.AdyenCheckout\nimport android.content.Intent\nclass MainActivity : ReactActivity() {'
  );

  // on Create
  contents = contents.replace(
    'super.onCreate(null)',
    'super.onCreate(null)\n    AdyenCheckout.setLauncherActivity(this)'
  );

  // on NewIntent
  if (contents.includes('override fun onNewIntent(intent: Intent?) {')) {
    contents = contents.replace(
      'super.onNewIntent(intent)\n',
      'super.onNewIntent(intent)\n    intent?.let { AdyenCheckout.handleIntent(it) }\n'
    );
  } else {
    contents = contents.replace(
      /}\n$/,
      '\n' +
        '  override fun onNewIntent(intent: Intent?) {\n' +
        '    super.onNewIntent(intent)\n' +
        '    intent?.let { AdyenCheckout.handleIntent(it) }\n' +
        '  }\n' +
        '}\n'
    );
  }

  // on ActivityResult
  if (
    contents.includes(
      'override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {'
    )
  ) {
    contents = contents.replace(
      'super.onActivityResult(requestCode, resultCode, data)\n',
      'super.onActivityResult(requestCode, resultCode, data)\n    AdyenCheckout.handleActivityResult(requestCode, resultCode, data)\n'
    );
  } else {
    contents = contents.replace(
      /}\n$/,
      '\n' +
        '  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {\n' +
        '    super.onActivityResult(requestCode, resultCode, data)\n' +
        '    AdyenCheckout.handleActivityResult(requestCode, resultCode, data)\n' +
        '  }\n' +
        '}\n'
    );
  }

  return contents;
}
