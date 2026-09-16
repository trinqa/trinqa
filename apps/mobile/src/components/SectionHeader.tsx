import { Host, Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';

import { colors, typography } from '@/theme';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Host matchContents>
      <Text
        modifiers={[
          font({ size: typography.sectionTitle, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {title}
      </Text>
    </Host>
  );
}
