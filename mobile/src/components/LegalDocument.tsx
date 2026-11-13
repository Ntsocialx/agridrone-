import { ScrollView, View } from "react-native";
import { Text } from "./Text";
import { BackHeader } from "./ui";

type Section = { heading: string; paragraphs?: string[]; bullets?: string[]; after?: string[] };
export type LegalContent = { title: string; status: string; updated: string; intro: string; sections: Section[] };

/**
 * Renders a legal document (privacy policy, terms). The same JSON is copied to the
 * public web pages by scripts/sync-legal.mjs.
 */
export function LegalDocument({ doc }: { doc: LegalContent }) {
  return (
    <View className="flex-1 bg-paper">
      <BackHeader title={doc.title} subtitle={`Last updated ${doc.updated}`} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-sun/15 border border-sun/40 rounded-md p-3 mt-5">
          <Text className="text-ink text-sm">{doc.status}</Text>
        </View>
        <Text className="text-ink leading-6 mt-5">{doc.intro}</Text>
        {doc.sections.map((section) => (
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
