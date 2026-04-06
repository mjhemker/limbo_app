import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, ArrowLeft, Users as UsersIcon, FileText, Circle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSearchUsers } from '../hooks/useFriends';
import { useAuth } from '../contexts/AuthContext';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'prompts' | 'circles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: userResults, isLoading: usersLoading } = useSearchUsers(
    debouncedQuery,
    activeTab === 'users' && debouncedQuery.length > 0
  );

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load recent searches
  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <SearchIcon size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setActiveTab('users')}
            className={`flex-1 py-2 rounded-lg ${
              activeTab === 'users' ? 'bg-black' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === 'users' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('prompts')}
            className={`flex-1 py-2 rounded-lg ${
              activeTab === 'prompts' ? 'bg-black' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === 'prompts' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Prompts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('circles')}
            className={`flex-1 py-2 rounded-lg ${
              activeTab === 'circles' ? 'bg-black' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === 'circles' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Circles
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1">
        {!debouncedQuery ? (
          /* Recent Searches */
          <View className="p-4">
            {recentSearches.length > 0 ? (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-semibold text-gray-900">Recent Searches</Text>
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text className="text-sm text-blue-600">Clear</Text>
                  </TouchableOpacity>
                </View>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSearch(search)}
                    className="py-3 border-b border-gray-100"
                  >
                    <Text className="text-gray-900">{search}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View className="items-center justify-center py-12">
                <SearchIcon size={48} color="#9ca3af" />
                <Text className="text-gray-500 mt-4">Search for users, prompts, or circles</Text>
              </View>
            )}
          </View>
        ) : (
          /* Search Results */
          <View className="p-4">
            {activeTab === 'users' && (
              <>
                {usersLoading ? (
                  <View className="items-center py-8">
                    <ActivityIndicator size="large" color="#000" />
                  </View>
                ) : userResults && userResults.length > 0 ? (
                  userResults.map((result: any) => (
                    <TouchableOpacity
                      key={result.id}
                      onPress={() => router.push(`/(tabs)/profile/${result.id}`)}
                      className="flex-row items-center py-3 border-b border-gray-100"
                    >
                      {result.avatar_url ? (
                        <Image
                          source={{ uri: result.avatar_url }}
                          className="w-12 h-12 rounded-full bg-gray-300"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center">
                          <Text className="text-gray-600 font-semibold">
                            {result.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text className="font-semibold text-gray-900">
                          {result.display_name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          @{result.username}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="items-center py-12">
                    <UsersIcon size={48} color="#9ca3af" />
                    <Text className="text-gray-500 mt-4">No users found</Text>
                  </View>
                )}
              </>
            )}

            {activeTab === 'prompts' && (
              <View className="items-center py-12">
                <FileText size={48} color="#9ca3af" />
                <Text className="text-gray-500 mt-4">Prompt search coming soon</Text>
              </View>
            )}

            {activeTab === 'circles' && (
              <View className="items-center py-12">
                <Circle size={48} color="#9ca3af" />
                <Text className="text-gray-500 mt-4">Circle search coming soon</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
