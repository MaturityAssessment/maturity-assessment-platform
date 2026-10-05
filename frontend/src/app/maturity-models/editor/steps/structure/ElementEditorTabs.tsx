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
    <TabGroup>
      <TabList
        aria-label={`${kind} settings`}
        className="flex gap-5 overflow-x-auto border-b border-gray-200 sm:gap-7"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className="group relative flex shrink-0 items-center gap-2 border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-gray-500 outline-none transition hover:text-gray-900 focus-visible:rounded-t-md focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 data-[selected]:border-blue-600 data-[selected]:text-blue-700"
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
      <TabPanels className="pt-6">
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            className="space-y-6 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      <h3 className="text-base font-semibold text-gray-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
    </div>
  );
}
