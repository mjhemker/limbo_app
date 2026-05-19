// Supabase Edge Function: send-notification
// Sends push notifications via Expo Push API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationPayload {
  type: "message" | "daily_prompt" | "friend_request" | "nudge" | "circle_message" | "circle_prompt";
  recipientUserId: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
  // For message notifications
  senderName?: string;
  senderId?: string;
  messagePreview?: string;
  // For friend requests
  requesterName?: string;
  requesterId?: string;
  // For nudges
  nudgerName?: string;
  nudgerId?: string;
  promptText?: string;
  // For circles
  circleName?: string;
  circleId?: string;
  // For daily prompts
  promptId?: string;
}

// Witty, personable notification messages
const getNotificationContent = (payload: NotificationPayload): { title: string; body: string } => {
  switch (payload.type) {
    case "message":
      const messageTemplates = [
        { title: `${payload.senderName} slid into your DMs`, body: payload.messagePreview || "Tap to see what they said" },
        { title: `New message from ${payload.senderName}`, body: payload.messagePreview || "They're waiting for you..." },
        { title: `${payload.senderName} says hey`, body: payload.messagePreview || "Don't leave them hanging!" },
      ];
      return messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

    case "daily_prompt":
      const promptTemplates = [
        { title: "Fresh prompt just dropped", body: payload.promptText || "What's your take?" },
        { title: "Today's prompt is here", body: payload.promptText || "Your friends are waiting to hear from you" },
        { title: "Time to share your thoughts", body: payload.promptText || "The daily prompt is live" },
        { title: "New prompt alert", body: `"${payload.promptText}"` || "Jump in before your friends do" },
      ];
      return promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

    case "friend_request":
      const friendTemplates = [
        { title: `${payload.requesterName} wants to be friends`, body: "Accept and start sharing prompts together" },
        { title: "New friend request!", body: `${payload.requesterName} wants to connect with you` },
        { title: `${payload.requesterName} sent you a friend request`, body: "Your circle is growing!" },
      ];
      return friendTemplates[Math.floor(Math.random() * friendTemplates.length)];

    case "nudge":
      const nudgeTemplates = [
        { title: `${payload.nudgerName} nudged you`, body: payload.promptText ? `"${payload.promptText}" - don't forget!` : "They want to hear from you!" },
        { title: "You've been nudged!", body: `${payload.nudgerName} is waiting for your answer` },
        { title: `${payload.nudgerName} says don't forget`, body: "Today's prompt is waiting for you" },
      ];
      return nudgeTemplates[Math.floor(Math.random() * nudgeTemplates.length)];

    case "circle_message":
      return {
        title: `New message in ${payload.circleName}`,
        body: payload.senderName ? `${payload.senderName}: ${payload.messagePreview || "sent a message"}` : payload.messagePreview || "Check it out",
      };

    case "circle_prompt":
      return {
        title: `New prompt in ${payload.circleName}`,
        body: payload.promptText || "A new prompt just dropped in your circle",
      };

    default:
      return { title: "Limbo", body: "You have a new notification" };
  }
};

// Get deep link data for navigation
const getNavigationData = (payload: NotificationPayload): Record<string, any> => {
  switch (payload.type) {
    case "message":
      return {
        screen: "messages",
        userId: payload.senderId,
        type: "message",
      };

    case "daily_prompt":
      return {
        screen: "feed",
        promptId: payload.promptId,
        type: "daily_prompt",
      };

    case "friend_request":
      return {
        screen: "friends",
        tab: "requests",
        type: "friend_request",
      };

    case "nudge":
      return {
        screen: "feed",
        type: "nudge",
      };

    case "circle_message":
      return {
        screen: "circle",
        circleId: payload.circleId,
        type: "circle_message",
      };

    case "circle_prompt":
      return {
        screen: "circle",
        circleId: payload.circleId,
        promptId: payload.promptId,
        type: "circle_prompt",
      };

    default:
      return { screen: "feed" };
  }
};

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recipient's push token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("expo_push_token, display_name")
      .eq("id", payload.recipientUserId)
      .single();

    if (profileError || !profile?.expo_push_token) {
      console.log("No push token for user:", payload.recipientUserId);
      return new Response(
        JSON.stringify({ success: false, error: "No push token" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate notification content
    const { title, body } = payload.title && payload.body
      ? { title: payload.title, body: payload.body }
      : getNotificationContent(payload);

    // Get navigation data for deep linking
    const navigationData = getNavigationData(payload);

    // Send to Expo Push API
    const pushPayload = {
      to: profile.expo_push_token,
      title,
      body,
      data: {
        ...navigationData,
        ...payload.data,
      },
      sound: "default",
      badge: 1,
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(pushPayload),
    });

    const result = await response.json();
    console.log("Push notification sent:", result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
