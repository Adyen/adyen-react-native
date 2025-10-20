import { setKotlinMainActivity } from '../setKotlinMainActivity';
import { describe, expect, test } from '@jest/globals';
import {
  basicMainActivity,
  mainActivityWithExistingImports,
  mainActivityWithOnNewIntent,
  mainActivityWithOnActivityResult,
  mainActivityWithAllMethods,
  mainActivityWithAllMethodsV52,
  mainActivityNoOnCreate,
  basicMainActivityWithExtention,
} from './_mock_MainActivity';

describe('setKotlinMainActivity', () => {
  describe('SDK version < 50 (pre-breaking changes)', () => {
    const sdkVersion = 49;

    test('should add imports and modify basic MainActivity', () => {
      const result = setKotlinMainActivity(basicMainActivity, sdkVersion);

      // Should add both imports
      expect(result).toContain('import com.adyenreactnativesdk.AdyenCheckout');
      expect(result).toContain('import android.content.Intent');
      expect(result).not.toContain('import android.app.ComponentCaller');

      // Should add AdyenCheckout.setLauncherActivity in onCreate
      expect(result).toContain(
        'super.onCreate(null)\n    AdyenCheckout.setLauncherActivity(this)'
      );

      // Should add onNewIntent method with nullable Intent
      expect(result).toContain('override fun onNewIntent(intent: Intent?) {');
      expect(result).toContain('super.onNewIntent(intent)');
      expect(result).toContain(
        'intent?.let { AdyenCheckout.handleIntent(it) }'
      );

      // Should add onActivityResult method without ComponentCaller
      expect(result).toContain(
        'override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {'
      );
      expect(result).toContain(
        'super.onActivityResult(requestCode, resultCode, data)'
      );
      expect(result).toContain(
        'AdyenCheckout.handleActivityResult(requestCode, resultCode, data)'
      );
      expect(result).not.toContain('caller: ComponentCaller');
    });

    test('should not duplicate imports if they already exist', () => {
      const result = setKotlinMainActivity(
        mainActivityWithExistingImports,
        sdkVersion
      );

      // Count occurrences of imports
      const adyenImportCount = (
        result.match(/import com\.adyenreactnativesdk\.AdyenCheckout/g) || []
      ).length;
      const intentImportCount = (
        result.match(/import android.content.Intent/g) || []
      ).length;

      expect(adyenImportCount).toBe(1);
      expect(intentImportCount).toBe(1);
    });

    test('should modify existing onNewIntent method', () => {
      const result = setKotlinMainActivity(
        mainActivityWithOnNewIntent,
        sdkVersion
      );

      // Should add handleIntent after super.onNewIntent
      expect(result).toContain(
        'super.onNewIntent(intent)\n    intent?.let { AdyenCheckout.handleIntent(it) }'
      );

      // Should not add duplicate onNewIntent method
      const onNewIntentCount = (result.match(/override fun onNewIntent/g) || [])
        .length;
      expect(onNewIntentCount).toBe(1);
    });

    test('should modify existing onActivityResult method', () => {
      const result = setKotlinMainActivity(
        mainActivityWithOnActivityResult,
        sdkVersion
      );

      // Should add handleActivityResult after super.onActivityResult
      expect(result).toContain(
        'super.onActivityResult(requestCode, resultCode, data)\n    AdyenCheckout.handleActivityResult(requestCode, resultCode, data)'
      );

      // Should not add duplicate onActivityResult method
      const onActivityResultCount = (
        result.match(/override fun onActivityResult/g) || []
      ).length;
      expect(onActivityResultCount).toBe(1);
    });
  });

  describe('SDK version >= 50 and < 52 (breaking changes, no ComponentCaller)', () => {
    const sdkVersion = 51;

    test('should use non-nullable Intent in onNewIntent', () => {
      const result = setKotlinMainActivity(basicMainActivity, sdkVersion);

      // Should add onNewIntent with non-nullable Intent
      expect(result).toContain('override fun onNewIntent(intent: Intent) {');
      expect(result).toContain('AdyenCheckout.handleIntent(intent)');
      expect(result).not.toContain('intent?.let');
      // Check specifically that onNewIntent doesn't use nullable Intent
      expect(result).not.toContain(
        'override fun onNewIntent(intent: Intent?) {'
      );
    });

    test('should use 3-parameter onActivityResult', () => {
      const result = setKotlinMainActivity(basicMainActivity, sdkVersion);

      // Should not have ComponentCaller parameter
      expect(result).toContain(
        'override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {'
      );
      expect(result).toContain(
        'super.onActivityResult(requestCode, resultCode, data)'
      );
      expect(result).not.toContain('caller: ComponentCaller');
      expect(result).not.toContain('import android.app.ComponentCaller');
    });
  });

  describe('SDK version >= 52 (onActivityResult with ComponentCaller)', () => {
    const sdkVersion = 52;

    test('should add ComponentCaller import', () => {
      const result = setKotlinMainActivity(basicMainActivity, sdkVersion);

      // Should add all three imports
      expect(result).toContain('import com.adyenreactnativesdk.AdyenCheckout');
      expect(result).toContain('import android.content.Intent');
      expect(result).toContain('import android.app.ComponentCaller');
    });

    test('should use 4-parameter onActivityResult with ComponentCaller', () => {
      const result = setKotlinMainActivity(basicMainActivity, sdkVersion);

      // Should have ComponentCaller parameter
      expect(result).toContain(
        'override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?, caller: ComponentCaller) {'
      );
      expect(result).toContain(
        'super.onActivityResult(requestCode, resultCode, data, caller)'
      );
      expect(result).toContain(
        'AdyenCheckout.handleActivityResult(requestCode, resultCode, data)'
      );
    });

    test('should modify existing onActivityResult with ComponentCaller', () => {
      const result = setKotlinMainActivity(mainActivityWithAllMethodsV52, sdkVersion);

      // Should add handleActivityResult after super.onActivityResult with ComponentCaller
      expect(result).toContain(
        'super.onActivityResult(requestCode, resultCode, data, caller)\n    AdyenCheckout.handleActivityResult(requestCode, resultCode, data)'
      );

      // Should not add duplicate onActivityResult method
      const onActivityResultCount = (
        result.match(/override fun onActivityResult/g) || []
      ).length;
      expect(onActivityResultCount).toBe(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle MainActivity with all methods already present', () => {
      const result = setKotlinMainActivity(mainActivityWithAllMethods, 49);

      // Should modify existing methods, not add duplicates
      const onNewIntentCount = (result.match(/override fun onNewIntent/g) || [])
        .length;
      const onActivityResultCount = (
        result.match(/override fun onActivityResult/g) || []
      ).length;

      expect(onNewIntentCount).toBe(1);
      expect(onActivityResultCount).toBe(1);

      // Should still contain all required modifications
      expect(result).toContain('AdyenCheckout.setLauncherActivity(this)');
      expect(result).toContain('AdyenCheckout.handleIntent');
      expect(result).toContain('AdyenCheckout.handleActivityResult');
    });

    test('should handle empty string', () => {
      const result = setKotlinMainActivity('', 50);
      expect(result).toBe('');
    });

    test('should handle MainActivity without onCreate', () => {
      const result = setKotlinMainActivity(mainActivityNoOnCreate, 50);

      // Should still add imports and other methods
      expect(result).toContain('import com.adyenreactnativesdk.AdyenCheckout');
      expect(result).toContain('override fun onNewIntent(intent: Intent) {');
      expect(result).toContain('override fun onActivityResult');
    });

    test('should maintain correct indentation', () => {
      const result = setKotlinMainActivity(basicMainActivity, 50);

      // Check that new methods have proper indentation (2 spaces for method, 4 for body)
      expect(result).toMatch(/\n  override fun onNewIntent/);
      expect(result).toMatch(/\n    super\.onNewIntent/);
      expect(result).toMatch(/\n  override fun onActivityResult/);
      expect(result).toMatch(/\n    super\.onActivityResult/);
    });

    test('should handle MainActivity with extension', () => {
      const result = setKotlinMainActivity(basicMainActivityWithExtention, 52);

      // Should add all three imports
      expect(result).toContain('import com.adyenreactnativesdk.AdyenCheckout');
      expect(result).toContain('import android.content.Intent');
      expect(result).toContain('import android.app.ComponentCaller');

      // Should add AdyenCheckout.setLauncherActivity in onCreate
      expect(result).toContain(
        'super.onCreate(null)\n    AdyenCheckout.setLauncherActivity(this)'
      );
    });

    test('should not duplicate method bodies when MainActivity has all methods for version 52', () => {
      const result = setKotlinMainActivity(
        mainActivityWithAllMethodsV52 ,
        52
      );

      // Should not add duplicate method calls
      const handleIntentCount = (
        result.match(/AdyenCheckout.handleIntent\(intent\)/g) || []
      ).length;
      expect(handleIntentCount).toBe(1);

      const handleActivityResultCount = (
        result.match(
          /AdyenCheckout.handleActivityResult\(requestCode, resultCode, data\)/g
        ) || []
      ).length;
      expect(handleActivityResultCount).toBe(1);
    });
  });

  describe('Import placement', () => {
    test('should add imports before class declaration', () => {
      const result = setKotlinMainActivity(basicMainActivity, 50);

      const classIndex = result.indexOf('class MainActivity');
      const adyenImportIndex = result.indexOf(
        'import com.adyenreactnativesdk.AdyenCheckout'
      );
      const intentImportIndex = result.indexOf('import android.content.Intent');

      expect(adyenImportIndex).toBeLessThan(classIndex);
      expect(intentImportIndex).toBeLessThan(classIndex);
    });
  });

  describe('onCreate modifications', () => {
    test('should add setLauncherActivity after super.onCreate', () => {
      const result = setKotlinMainActivity(basicMainActivity, 50);

      // Should be on next line after super.onCreate(null)
      expect(result).toContain(
        'super.onCreate(null)\n    AdyenCheckout.setLauncherActivity(this)'
      );
    });
  });

  describe('Version boundary tests', () => {
    test('version 49 should use nullable Intent', () => {
      const result = setKotlinMainActivity(basicMainActivity, 49);
      expect(result).toContain('Intent?');
      expect(result).toContain('intent?.let');
    });

    test('version 50 should use non-nullable Intent', () => {
      const result = setKotlinMainActivity(basicMainActivity, 50);
      expect(result).toContain('override fun onNewIntent(intent: Intent) {');
      expect(result).not.toContain('intent?.let');
    });

    test('version 51 should not have ComponentCaller', () => {
      const result = setKotlinMainActivity(basicMainActivity, 51);
      expect(result).not.toContain('ComponentCaller');
    });

    test('version 52 should have ComponentCaller', () => {
      const result = setKotlinMainActivity(basicMainActivity, 52);
      expect(result).toContain('ComponentCaller');
    });

    test('version 53 should have ComponentCaller', () => {
      const result = setKotlinMainActivity(basicMainActivity, 53);
      expect(result).toContain('ComponentCaller');
    });
  });
});
