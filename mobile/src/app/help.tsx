import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Text } from "../components/Text";
import { BackHeader, Button } from "../components/ui";
import { FAQS, SUPPORT_EMAIL } from "../content/help";

/** FAQs, contact support by email, and a link to the privacy policy. */
export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  const [mailError, setMailError] = useState(false);

  const email = async () => {
    setMailError(false);
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("AgricDrone Hub support")}`);
    } catch {
      // No email app on the phone: show the address so it can be copied.
      setMailError(true);
    }
  };

  return (
    <View className="flex-1 bg-paper">
      <BackHeader title="Help & support" subtitle="Answers to common questions" />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        <View className="bg-page rounded-lg px-4">
          {FAQS.map((item, i) => {
            const expanded = open === i;
            return (
              <View key={item.q} className={i < FAQS.length - 1 ? "border-b border-line" : ""}>
                <Pressable
                  onPress={() => setOpen(expanded ? null : i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  className="flex-row items-center py-4"
                >
                  <Text className="text-ink font-semibold flex-1 mr-3">{item.q}</Text>
                  <Text className="text-teal-ink text-lg">{expanded ? "−" : "+"}</Text>
                </Pressable>
                {expanded ? <Text className="text-muted leading-6 pb-4">{item.a}</Text> : null}
              </View>
            );
          })}
        </View>

        <Text className="text-ink font-bold text-lg mt-8 mb-2">Still need help?</Text>
        <Text className="text-muted mb-4">Email us and we&apos;ll get back to you. Include the email address you signed up with.</Text>
        <Button label="Contact support" onPress={email} />
        {mailError ? (
          <Text className="text-ink text-sm mt-3" selectable>
            No email app found. Write to {SUPPORT_EMAIL}
          </Text>
        ) : (
          <Text className="text-muted text-xs mt-3 text-center" selectable>{SUPPORT_EMAIL}</Text>
        )}

        <Pressable onPress={() => router.push("/privacy")} accessibilityRole="link" className="self-center mt-8 py-2">
          <Text className="text-teal-ink font-bold">Privacy policy</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
