import { ScrollView, View } from "react-native";
import { Text } from "../components/Text";
import { BackHeader } from "../components/ui";
import privacy from "../content/privacy.json";

type Section = { heading: string; paragraphs?: string[]; bullets?: string[]; after?: string[] };

/** The privacy policy (same text as the public web page; see scripts/sync-privacy.mjs). */
export default function PrivacyScreen() {
  return (
    <View className="flex-1 bg-paper">
      <BackHeader title={privacy.title} subtitle={`Last updated ${privacy.updated}`} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-sun/15 border border-sun/40 rounded-md p-3 mt-5">
          <Text className="text-ink text-sm">{privacy.status}</Text>
        </View>
        <Text className="text-ink leading-6 mt-5">{privacy.intro}</Text>
        {(privacy.sections as Section[]).map((section) => (
          <View key={section.heading} className="mt-7">
            <Text className="text-ink font-bold text-lg mb-2">{section.heading}</Text>
            {section.paragraphs?.map((p) => <Paragraph key={p} text={p} />)}
            {section.bullets?.map((b) => (
              <View key={b} className="flex-row mb-2 pr-2">
                <Text className="text-teal-ink mr-2 leading-6">•</Text>
                <Text className="text-ink flex-1 leading-6">{b}</Text>
              </View>
            ))}
            {section.after?.map((p) => <Paragraph key={p} text={p} />)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const Paragraph = ({ text }: { text: string }) => <Text className="text-ink leading-6 mb-2">{text}</Text>;
