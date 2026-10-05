import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import type { ReactNode } from "react";

type EditorTab = {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export default function ElementEditorTabs({
  kind,
  tabs,
}: {
  kind: string;
  tabs: EditorTab[];
}) {
  return (
    <TabGroup className="@container">
      <TabList
        aria-label={`${kind} settings`}
        className="grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 @2xl:grid-cols-4"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className="group flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition hover:bg-white/70 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-blue-500 data-[selected]:bg-white data-[selected]:text-blue-700 data-[selected]:shadow-sm"
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs tabular-nums text-gray-600 group-data-[selected]:bg-blue-50 group-data-[selected]:text-blue-700">
                {tab.count}
              </span>
            )}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="pt-7">
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            className="space-y-6 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}

export function EditorSectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight text-gray-950">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{description}</p>
    </div>
  );
}
