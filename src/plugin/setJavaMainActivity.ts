export function setJavaMainActivity(contents: string): string {
  contents = contents.replace(
    'public class MainActivity extends ReactActivity {',
    'import com.adyenreactnativesdk.AdyenCheckout;\nimport android.content.Intent;\npublic class MainActivity extends ReactActivity {'
  );

  // on Create
  contents = contents.replace(
    'super.onCreate(null);\n  }',
    'super.onCreate(null);\n    AdyenCheckout.setLauncherActivity(this);\n  }'
  );

  // on NewIntent
  if (contents.includes('public void onNewIntent(Intent intent) {')) {
    contents = contents.replace(
      'super.onNewIntent(intent);\n  }',
      'super.onNewIntent(intent);\n    AdyenCheckout.handleIntent(intent);\n  }'
    );
  } else {
    contents = contents.replace(
      /}\n$/,
      '\n' +
        '  @Override\n' +
        '  public void onNewIntent(Intent intent) {\n' +
        '    super.onNewIntent(intent);\n' +
        '    AdyenCheckout.handleIntent(intent);\n' +
        '  }\n' +
        '}\n'
    );
  }

  // on ActivityResult
  if (
    contents.includes(
      'public void onActivityResult(int requestCode, int resultCode, Intent data) {'
    )
  ) {
    contents = contents.replace(
      'super.onActivityResult(requestCode, resultCode, data);\n  }',
      'super.onActivityResult(requestCode, resultCode, data);\n    AdyenCheckout.handleActivityResult(requestCode, resultCode, data);\n  }'
    );
  } else {
    contents = contents.replace(
      /}\n$/,
      '\n' +
        '  @Override\n' +
        '  public void onActivityResult(int requestCode, int resultCode, Intent data) {\n' +
        '    super.onActivityResult(requestCode, resultCode, data);\n' +
        '    AdyenCheckout.handleActivityResult(requestCode, resultCode, data);\n' +
        '  }\n' +
        '}\n'
    );
  }

  return contents;
}
