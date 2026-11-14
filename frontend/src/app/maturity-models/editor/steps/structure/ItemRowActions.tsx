import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowDownIcon, ArrowUpIcon, EllipsisHorizontalIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function ItemRowActions({ name, canMoveUp, canMoveDown, canDelete, onMoveUp, onMoveDown, onDelete }: {
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <Menu as="div" className="relative col-start-3 row-start-1 justify-self-end @lg:col-start-auto">
      <MenuButton aria-label={`Actions for ${name}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </MenuButton>
      <MenuItems anchor="bottom end" portal className="z-[60] w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg outline-none [--anchor-gap:4px]">
        {[
          { label: "Move up", Icon: ArrowUpIcon, disabled: !canMoveUp, action: onMoveUp },
          { label: "Move down", Icon: ArrowDownIcon, disabled: !canMoveDown, action: onMoveDown },
          { label: "Delete", Icon: TrashIcon, disabled: !canDelete, action: onDelete },
        ].map(({ label, Icon, disabled, action }) => (
          <MenuItem key={label} disabled={disabled}>
            <button type="button" disabled={disabled} onClick={action} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm data-[focus]:bg-gray-50 data-[disabled]:opacity-30 ${label === "Delete" ? "text-red-600" : "text-gray-700"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
