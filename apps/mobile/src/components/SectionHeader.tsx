import { Text } from '@expo/ui/swift-ui';

import { sectionTitleModifiers } from '@/theme/swiftUi';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return <Text modifiers={sectionTitleModifiers()}>{title}</Text>;
}
