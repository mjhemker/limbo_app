import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useChatPromptResponses } from '../../../../../hooks/useChats';
import { responsesService } from '../../../../../services/supabase/responses';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../../../../utils/toast';
import * as haptics from '../../../../../utils/haptics';

export default function ResponsesViewPage() {
  const { promptId, promptText, creatorName } = useLocalSearchParams<{
    promptId: string;
    promptText?: string;
    creatorName?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: responses, isLoading } = useChatPromptResponses(promptId);

  const headerTitle = creatorName ? `${creatorName}'s prompt` : 'Responses';

  const handleLongPress = (response: any) => {
    if (response.user_id !== user?.id) return;

    Alert.alert(
      'Delete Response',
      'Are you sure you want to delete your response?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await responsesService.deleteResponse(response.id);
              haptics.success();
              toast.success('Response deleted');
              queryClient.invalidateQueries({ queryKey: ['chatPromptResponses', promptId] });
              queryClient.invalidateQueries({ queryKey: ['respondedPromptIds'] });
              queryClient.invalidateQueries({ queryKey: ['responseCountsForPrompts'] });
            } catch (e: any) {
              haptics.error();
              toast.error(e.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft weight="bold" size={24} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="text-lg font-semibold text-gray-900 font-heading">{headerTitle}</Text>
          <Text className="text-sm text-gray-500">{responses?.length || 0} responses</Text>
        </View>
      </View>

      {/* Prompt */}
      <View className="px-6 py-5 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900 text-center font-heading">
          {promptText || ''}
        </Text>
      </View>

      {/* Responses */}
      <ScrollView className="flex-1">
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : responses && responses.length > 0 ? (
          <View className="p-4 gap-4">
            {responses.map((response: any) => {
              const isOwn = response.user_id === user?.id;

              return (
                <Pressable
                  key={response.id}
                  onLongPress={() => handleLongPress(response)}
                  delayLongPress={500}
                  style={({ pressed }) => ({ opacity: pressed && isOwn ? 0.8 : 1 })}
                >
                  <View
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    {/* User */}
                    <View className="flex-row items-center px-4 pt-4 pb-3">
                      {response.user?.avatar_url ? (
                        <Image
                          source={{ uri: response.user.avatar_url }}
                          className="w-9 h-9 rounded-full bg-gray-300 mr-3"
                        />
                      ) : (
                        <View className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center mr-3">
                          <Text className="text-gray-600 text-sm font-bold">
                            {response.user?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text className="font-semibold text-gray-900 text-base">
                        {response.user?.display_name}
                      </Text>
                    </View>

                    {/* Media */}
                    {response.media_url && (
                      <Image
                        source={{ uri: response.media_url }}
                        style={{ width: SCREEN_WIDTH - 34, height: SCREEN_WIDTH - 34 }}
                        resizeMode="contain"
                      />
                    )}

                    {/* Text */}
                    {response.text_content ? (
                      <View className="px-4 py-3">
                        <Text className="text-base text-gray-800 leading-6">
                          {response.text_content}
                        </Text>
                      </View>
                    ) : null}

                    {/* Debate side badge */}
                    {response.debate_side && (
                      <View className="px-4 pb-3">
                        <View
                          className={`self-start px-3 py-1 rounded-full ${
                            response.debate_side === 'side_a' ? 'bg-blue-100' : 'bg-red-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              response.debate_side === 'side_a' ? 'text-blue-700' : 'text-red-700'
                            }`}
                          >
                            Side {response.debate_side === 'side_a' ? 'A' : 'B'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="py-16 items-center">
            <Text className="text-gray-500 text-base">No responses yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
