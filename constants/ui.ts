export type TabBarVariant = 'anchored' | 'floating';

// Change this to 'floating' to use a floating, icons-only tab bar.
export const UIFlags: { tabBarVariant: TabBarVariant } = {
  tabBarVariant: 'floating',  // Changed to floating to fix Android tap issues
};
