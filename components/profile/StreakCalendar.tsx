import { View, Text, ScrollView } from 'react-native';
import { useMemo } from 'react';

interface StreakCalendarProps {
  responseDates: string[];  // Array of ISO date strings when user responded
  streak: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakCalendar({ responseDates, streak }: StreakCalendarProps) {
  // Generate last 12 weeks (84 days) of data
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a Set of response dates for fast lookup
    const responseSet = new Set(
      responseDates.map(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
      })
    );

    // Generate weeks (12 weeks = 84 days)
    const weeks: { date: Date; hasResponse: boolean }[][] = [];

    // Start from 12 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83); // Go back 83 days (12 weeks - 1 day)
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentWeek: { date: Date; hasResponse: boolean }[] = [];

    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const hasResponse = responseSet.has(dateStr);

      currentWeek.push({ date, hasResponse });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [responseDates]);

  // Get month labels for the calendar
  const monthLabels = useMemo(() => {
    const labels: { month: string; index: number }[] = [];
    let lastMonth = -1;

    calendarData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      const month = firstDayOfWeek.date.getMonth();

      if (month !== lastMonth) {
        labels.push({ month: MONTHS[month], index: weekIndex });
        lastMonth = month;
      }
    });

    return labels;
  }, [calendarData]);

  // Calculate total responses and longest streak info
  const totalResponses = responseDates.length;

  return (
    <View className="bg-gray-50 rounded-3xl p-5 border border-gray-200">
      {/* Header with streak */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-lg font-bold text-black font-heading">Activity</Text>
          <Text className="text-sm text-gray-500">{totalResponses} total responses</Text>
        </View>
        <View className="flex-row items-center bg-orange-100 px-3 py-1.5 rounded-full">
          <Text className="text-xl mr-1">🔥</Text>
          <Text className="text-orange-700 font-bold">{streak} day streak</Text>
        </View>
      </View>

      {/* Month labels */}
      <View className="flex-row mb-1 ml-5">
        {monthLabels.map((label, idx) => (
          <Text
            key={idx}
            className="text-xs text-gray-500"
            style={{
              position: 'absolute',
              left: 20 + label.index * 14
            }}
          >
            {label.month}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row mt-4">
          {/* Day labels */}
          <View className="mr-1">
            {DAYS.map((day, idx) => (
              <View key={idx} className="h-3.5 justify-center" style={{ marginBottom: 2 }}>
                {idx % 2 === 1 && (
                  <Text className="text-xs text-gray-400">{day}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Weeks */}
          {calendarData.map((week, weekIndex) => (
            <View key={weekIndex} className="mr-0.5">
              {week.map((day, dayIndex) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isFuture = day.date > today;
                const isToday = day.date.toDateString() === today.toDateString();

                return (
                  <View
                    key={dayIndex}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isFuture
                        ? 'bg-gray-100'
                        : day.hasResponse
                        ? 'bg-primary-500'
                        : 'bg-gray-200'
                    }`}
                    style={{
                      marginBottom: 2,
                      borderWidth: isToday ? 1 : 0,
                      borderColor: isToday ? '#000' : undefined
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View className="flex-row items-center justify-end mt-3">
        <Text className="text-xs text-gray-500 mr-2">Less</Text>
        <View className="w-3 h-3 rounded-sm bg-gray-200 mr-1" />
        <View className="w-3 h-3 rounded-sm bg-primary-300 mr-1" />
        <View className="w-3 h-3 rounded-sm bg-primary-500 mr-1" />
        <Text className="text-xs text-gray-500 ml-1">More</Text>
      </View>
    </View>
  );
}
