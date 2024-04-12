const defaultTheme = 'AppTheme';

export function setAppTheme(androidStyles: any) {
  let resources = androidStyles['resources'];
  if (!resources) {
    resources = {
      $: { 'xmlns:tools': 'http://schemas.android.com/tools' },
    };
    androidStyles['resources'] = resources;
  }

  let styles = resources['style'];
  if (!Array.isArray(styles)) {
    styles = [];
    resources['style'] = styles;
  }

  let appTheme = styles.find((item: any) => item.$['name'] === defaultTheme);
  if (!appTheme) {
    console.log(
      `Default theme is not '${defaultTheme}'. Please set your theme parent as descendent of 'Theme.MaterialComponents'`
    );
  } else {
    var parentTheme = 'Theme.MaterialComponents.Light.NoActionBar';
    const oldParent = appTheme.$['parent'];
    if (oldParent && oldParent.includes('DayNight')) {
      parentTheme = 'Theme.MaterialComponents.DayNight.NoActionBar';
    }
    appTheme.$ = { name: defaultTheme, parent: parentTheme };
  }

  let unwantedAppTheme = styles.findLast(
    (item: any) =>
      item.$['name'] === defaultTheme && item.$['parent'].includes('AppCompat')
  );
  if (unwantedAppTheme) {
    const index = styles.indexOf(unwantedAppTheme);
    styles.splice(index, 1);
  }
  return androidStyles;
}
