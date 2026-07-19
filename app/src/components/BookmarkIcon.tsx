import Svg, { Path } from 'react-native-svg';

type BookmarkIconProps = {
  filled?: boolean;
  size?: number;
  color?: string;
};

export function BookmarkIcon({
  filled = false,
  size = 24,
  color = '#EC6381',
}: BookmarkIconProps) {
  return (
    <Svg fill={filled ? color : 'none'} height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M15.75 5H8.25C7.55964 5 7 5.58763 7 6.3125V19L12 15.5L17 19V6.3125C17 5.58763 16.4404 5 15.75 5Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}
