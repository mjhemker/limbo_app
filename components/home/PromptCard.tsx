import { View, Text, Pressable, Image } from 'react-native';
import { ReactNode } from 'react';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight, CheckCircle, LockSimple } from 'phosphor-react-native';
import { getPromptType, getInverse, PromptTypeId } from '../../lib/promptTypes';
import * as haptics from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 30, stiffness: 400 };

type Prompt = {
  text: string;
  created_at?: string;
  [k: string]: any;
};

type FriendResponse = {
  id: string;
  user?: { display_name?: string; avatar_url?: string };
  [k: string]: any;
};

export type PromptCardProps = {
  type: PromptTypeId;
  prompt?: Prompt | null;
  hasAnswered?: boolean;
  friendsResponses?: FriendResponse[];
  onPress?: () => void;
  onAnswerPress?: () => void;
  answerLabel?: string;
  viewLabel?: string;
  typeInfo?: string;
  headerRight?: ReactNode;
  content?: ReactNode;
  label?: string;
  hideButton?: boolean;
  entering?: any;
};

const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d
    .toLocaleString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

function DefaultStatusIcon({ answered, color }: { answered: boolean; color: string }) {
  return answered ? (
    <CheckCircle size={18} color={color} weight="fill" />
  ) : (
    <LockSimple size={18} color={color} weight="bold" />
  );
}

export default function PromptCard({
  type,
  prompt,
  hasAnswered = false,
  friendsResponses,
  onPress,
  onAnswerPress,
  answerLabel,
  viewLabel,
  typeInfo,
  headerRight,
  content,
  label,
  hideButton = false,
  entering,
}: PromptCardProps) {
  if (!prompt) return null;

  const config = getPromptType(type);
  const Icon = config.icon;
  const inverse = getInverse(config.primary);

  const friendsCount = friendsResponses?.length ?? 0;
  const buttonLabel = hasAnswered
    ? viewLabel ?? (friendsCount > 3 ? `See ${friendsCount} responses` : 'See responses')
    : answerLabel ?? 'Answer';

  const cardScale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleCardPress = () => {
    haptics.lightImpact();
    onPress?.();
  };

  const handleAnswerPress = () => {
    haptics.lightImpact();
    (onAnswerPress ?? onPress)?.();
  };

  // Soft tint for the primary text on header label (e.g. yellow card → black/60)
  const subtleColor = config.primary + '99'; // ~60% alpha on hex

  return (
    <Animated.View entering={entering ?? FadeInDown.duration(400).springify()}>
      <AnimatedPressable
        onPress={handleCardPress}
        onPressIn={() => (cardScale.value = withSpring(0.98, SPRING))}
        onPressOut={() => (cardScale.value = withSpring(1, SPRING))}
        style={[cardStyle, { backgroundColor: config.color, borderRadius: 28, padding: 20 }]}
      >
        {/* HEADER */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <Icon size={16} color={config.primary} weight="bold" />
            <Text
              className="font-bold text-[10px] uppercase ml-2"
              style={{ color: config.primary, letterSpacing: 1.5 }}
              numberOfLines={1}
            >
              {label ?? config.label}
              {(typeInfo ?? formatDate(prompt.created_at)) ? (
                <Text style={{ color: subtleColor }}>
                  {'   '}
                  {typeInfo ?? formatDate(prompt.created_at)}
                </Text>
              ) : null}
            </Text>
          </View>
          <View className="ml-2">
            {headerRight ?? <DefaultStatusIcon answered={hasAnswered} color={config.primary} />}
          </View>
        </View>

        {/* PROMPT TEXT */}
        <Text
          className="text-[24px] font-extrabold leading-tight"
          style={{ color: config.primary, letterSpacing: -0.5 }}
        >
          {prompt.text}
        </Text>

        {/* CONTENT SLOT (themed inverse) */}
        {content != null && (
          <View
            style={{
              backgroundColor: config.primary,
              borderRadius: 14,
              padding: 14,
              marginTop: 16,
            }}
          >
            {content}
          </View>
        )}

        {/* BOTTOM ROW */}
        {(!hideButton || (hasAnswered && friendsCount > 3)) && (
          <View className="flex-row items-center justify-between mt-4">
            {!hideButton ? (
              <AnimatedPressable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  handleAnswerPress();
                }}
                onPressIn={() => (btnScale.value = withSpring(0.96, SPRING))}
                onPressOut={() => (btnScale.value = withSpring(1, SPRING))}
                style={[
                  btnStyle,
                  {
                    backgroundColor: config.primary,
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text
                  className="font-bold text-[13px]"
                  style={{ color: inverse, letterSpacing: -0.2 }}
                >
                  {buttonLabel}
                </Text>
                {!hasAnswered && (
                  <ArrowRight size={14} color={inverse} weight="bold" style={{ marginLeft: 6 }} />
                )}
              </AnimatedPressable>
            ) : (
              <View />
            )}

            {/* Friend avatar stack */}
            {hasAnswered && friendsCount > 3 && friendsResponses && (
              <View className="flex-row items-center">
                <View className="flex-row">
                  {friendsResponses.slice(0, 4).map((resp, idx) => {
                    const initial = resp.user?.display_name?.[0]?.toUpperCase() ?? '?';
                    const bg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    return resp.user?.avatar_url ? (
                      <Image
                        key={resp.id}
                        source={{ uri: resp.user.avatar_url }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          borderWidth: 2,
                          borderColor: config.color,
                          marginLeft: idx > 0 ? -8 : 0,
                          zIndex: 4 - idx,
                        }}
                      />
                    ) : (
                      <View
                        key={resp.id}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: bg,
                          borderWidth: 2,
                          borderColor: config.color,
                          marginLeft: idx > 0 ? -8 : 0,
                          zIndex: 4 - idx,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text className="text-white font-bold text-[11px]">{initial}</Text>
                      </View>
                    );
                  })}
                </View>
                {friendsCount > 4 && (
                  <View
                    style={{
                      backgroundColor: config.primary,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginLeft: 6,
                    }}
                  >
                    <Text style={{ color: inverse }} className="font-bold text-[11px]">
                      +{friendsCount - 4}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}
