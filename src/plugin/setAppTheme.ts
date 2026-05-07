const defaultTheme = 'AppTheme';

export function setAppTheme(androidStyles: any) {
  let resources = androidStyles.resources;
  if (!resources) {
    resources = {
      $: { 'xmlns:tools': 'http://schemas.android.com/tools' },
    };
    androidStyles.resources = resources;
  }

  let styles = resources.style;
  if (!Array.isArray(styles)) {
    styles = [];
    resources.style = styles;
  }

  const appTheme = styles.find((item: any) => item.$.name === defaultTheme);
  if (appTheme) {
    let parentTheme = 'Theme.MaterialComponents.Light.NoActionBar';
    if (appTheme.$.parent?.includes('DayNight')) {
      parentTheme = 'Theme.MaterialComponents.DayNight.NoActionBar';
    }
    appTheme.$ = { name: defaultTheme, parent: parentTheme };
  } else {
    console.log(
      `Default theme is not '${defaultTheme}'. Please set your theme parent as descendent of 'Theme.MaterialComponents'`
    );
  }

  let unwantedAppTheme = styles.findLast(
    (item: any) =>
      item.$.name === defaultTheme && item.$.parent.includes('AppCompat')
  );
  if (unwantedAppTheme) {
    const index = styles.indexOf(unwantedAppTheme);
    styles.splice(index, 1);
  }
  return androidStyles;
}
