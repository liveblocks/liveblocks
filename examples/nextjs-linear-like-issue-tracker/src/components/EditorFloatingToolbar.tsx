import { FloatingToolbar, Toolbar } from "@liveblocks/react-lexical";

export function EditorFloatingToolbar() {
  // Toolbar with custom styling in each block select item, e.g. "Heading 1" is larger
  // Alternatively, uncomment this for the same component with default styles:
  // return <FloatingToolbar />
  return (
    <FloatingToolbar>
      <Toolbar.BlockSelector
        items={(defaultItems) =>
          defaultItems.map((item) => {
            let label;

            if (item.name === "Text") {
              label = <span>Regular text</span>;
            }

            if (item.name === "Heading 1") {
              label = (
                <span className="text-[17.5px] font-bold">Heading 1</span>
              );
            }

            if (item.name === "Heading 2") {
              label = <span className="text-[16px] font-bold">Heading 2</span>;
            }

            if (item.name === "Heading 3") {
              label = <span className="text-[15px] font-bold">Heading 3</span>;
            }

            if (item.name === "Blockquote") {
              label = (
                <span className="border-l-[3px] pl-2 border-gray-600">
                  Blockquote
                </span>
              );
            }

            return {
              ...item,
              label,
              icon: null, // Hide the icons
            };
          })
        }
      />
      <Toolbar.SectionInline />
      <Toolbar.Separator />
      <Toolbar.SectionCollaboration />
    </FloatingToolbar>
  );
}
