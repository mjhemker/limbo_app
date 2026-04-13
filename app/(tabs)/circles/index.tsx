import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useMyGroupChats as useMyCircles } from '../../../hooks/useChats';
import { CircleCreationModal } from '../../../components/circles/CircleCreationModal';

export default function CirclesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: circles, isLoading, refetch } = useMyCircles(user?.id);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateCircle = () => {
    setShowCreateModal(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View className="px-5 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-black text-black">Circles</Text>
          <TouchableOpacity
            onPress={handleCreateCircle}
            className="bg-black rounded-full px-4 py-2.5 flex-row items-center"
            activeOpacity={0.7}
          >
            <Plus size={18} color="white" strokeWidth={2.5} />
            <Text className="text-white font-semibold ml-1.5">New Circle</Text>
          </TouchableOpacity>
        </View>

        {/* Circles List */}
        {circles && circles.length > 0 ? (
          <View>
            {circles.map((circle: any, index: number) => (
              <TouchableOpacity
                key={circle.id}
                className="bg-white border border-gray-200 rounded-3xl p-5 mb-4"
                onPress={() => router.push(`/(tabs)/circles/${circle.id}`)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  {/* Circle Avatar */}
                  {circle.avatar_url ? (
                    <Image
                      source={{ uri: circle.avatar_url }}
                      className="w-16 h-16 rounded-full bg-gray-200"
                    />
                  ) : (
                    <View
                      className="w-16 h-16 rounded-full items-center justify-center"
                      style={{ backgroundColor: circle.theme_color || '#FFBF00' }}
                    >
                      <Text className="text-white font-bold text-2xl">
                        {circle.name?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Circle Info */}
                  <View className="flex-1 ml-4">
                    <Text className="text-lg font-bold text-black">
                      {circle.name}
                    </Text>
                    {circle.description && (
                      <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
                        {circle.description}
                      </Text>
                    )}
                  </View>

                  {/* Admin Badge if applicable */}
                  {circle.is_admin && (
                    <View className="ml-2 bg-primary-100 rounded-full px-2 py-1">
                      <Text className="text-xs font-semibold text-primary-700">
                        Admin
                      </Text>
                    </View>
                  )}
                </View>

                {/* Member Avatars */}
                <View className="flex-row items-center mt-4 pt-3 border-t border-gray-100">
                  <View className="flex-row -space-x-2">
                    {circle.members?.slice(0, 5).map((member: any, idx: number) => (
                      member.user?.avatar_url ? (
                        <Image
                          key={member.user_id}
                          source={{ uri: member.user.avatar_url }}
                          className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                          style={{ marginLeft: idx > 0 ? -8 : 0 }}
                        />
                      ) : (
                        <View
                          key={member.user_id}
                          className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 items-center justify-center"
                          style={{ marginLeft: idx > 0 ? -8 : 0 }}
                        >
                          <Text className="text-gray-600 text-xs font-semibold">
                            {member.user?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )
                    ))}
                    {circle.member_count > 5 && (
                      <View
                        className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 items-center justify-center"
                        style={{ marginLeft: -8 }}
                      >
                        <Text className="text-gray-600 text-xs font-semibold">
                          +{circle.member_count - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-gray-500 ml-3">
                    {circle.member_count || 0} {(circle.member_count || 0) === 1 ? 'member' : 'members'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-gray-50 rounded-3xl p-12 items-center border border-gray-200">
            <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
              <Users size={28} color="#9ca3af" />
            </View>
            <Text className="text-lg font-bold text-black text-center mb-2">
              No circles yet
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Create or join a circle to get started
            </Text>
            <TouchableOpacity
              onPress={handleCreateCircle}
              className="bg-black rounded-full px-6 py-3"
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold">Create Circle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </ScrollView>

      {/* Circle Creation Modal */}
      <CircleCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
  );
}
