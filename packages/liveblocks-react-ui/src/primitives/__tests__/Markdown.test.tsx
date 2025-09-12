import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { Markdown, type MarkdownComponents } from "../Markdown";
import { dedent } from "./_utils";

describe("Markdown", () => {
  afterEach(() => {
    cleanup();
  });

  test("should rerender when the content changes", () => {
    const { getByTestId, rerender } = render(
      <Markdown data-testid="markdown" content="A" />
    );

    const root = getByTestId("markdown");

    expect(root.textContent).toBe("A");
    expect(root.querySelector("a")).not.toBeInTheDocument();

    rerender(
      <Markdown
        data-testid="markdown"
        content="A [link](https://liveblocks.io)."
      />
    );

    expect(root.textContent).toBe("A link.");
    expect(root.querySelector("a")).toHaveAttribute(
      "href",
      "https://liveblocks.io"
    );
  });

  test("should render empty content", () => {
    {
      const { getByTestId, unmount } = render(
        // @ts-expect-error - Testing a missing `content` prop
        <Markdown data-testid="markdown" />
      );

      const root = getByTestId("markdown");
      expect(root.innerHTML).toBe("");

      unmount();
    }

    {
      const { getByTestId, unmount } = render(
        <Markdown data-testid="markdown" content="" />
      );

      const root = getByTestId("markdown");
      expect(root.innerHTML).toBe("");

      unmount();
    }

    {
      const { getByTestId, unmount } = render(
        <Markdown data-testid="markdown" content={"   \n\t  "} />
      );

      const root = getByTestId("markdown");
      expect(root.innerHTML).toBe("");

      unmount();
    }
  });

  describe("should render…", () => {
    function assert(content: string, assertions: (root: HTMLElement) => void) {
      const { getByTestId, unmount } = render(
        <Markdown data-testid="markdown" content={dedent(content)} />
      );

      assertions(getByTestId("markdown"));
      unmount();
    }

    test("paragraphs", () => {
      assert(
        `
          A paragraph.
  
          Another paragraph which
          spans multiple lines.
        `,
        (root) => {
          const paragraphs = root.querySelectorAll("p");

          expect(paragraphs).toHaveLength(2);
          expect(paragraphs[0]?.textContent).toBe("A paragraph.");
          expect(paragraphs[1]?.textContent).toBe(
            "Another paragraph which\nspans multiple lines."
          );
        }
      );
    });

    test("headings", () => {
      assert(
        `
          # Heading 1
  
          ## Heading 2
  
          ### Heading 3
  
          #### Heading 4
  
          ##### Heading 5
  
          ###### Heading 6
  
          Alternate heading 1
          ===============
  
          Alternate heading 2
          --------------
        `,
        (root) => {
          const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");

          expect(headings).toHaveLength(8);
          expect(headings[0]?.textContent).toBe("Heading 1");
          expect(headings[1]?.textContent).toBe("Heading 2");
          expect(headings[2]?.textContent).toBe("Heading 3");
          expect(headings[3]?.textContent).toBe("Heading 4");
          expect(headings[4]?.textContent).toBe("Heading 5");
          expect(headings[5]?.textContent).toBe("Heading 6");
          expect(headings[6]?.textContent).toBe("Alternate heading 1");
          expect(headings[7]?.textContent).toBe("Alternate heading 2");
        }
      );
    });

    test("bold text", () => {
      assert(
        `
          **Bold** and __bold__.
        `,
        (root) => {
          const strongs = root.querySelectorAll("strong");

          expect(strongs).toHaveLength(2);
          expect(strongs[0]?.textContent).toBe("Bold");
          expect(strongs[1]?.textContent).toBe("bold");
        }
      );
    });

    test("italic text", () => {
      assert(
        `
          *Italic* and _italic_.
        `,
        (root) => {
          const ems = root.querySelectorAll("em");

          expect(ems).toHaveLength(2);
          expect(ems[0]?.textContent).toBe("Italic");
          expect(ems[1]?.textContent).toBe("italic");
        }
      );
    });

    test("strikethrough text", () => {
      assert(
        `
          ~~Strikethrough~~ and ~strikethrough~.
        `,
        (root) => {
          const dels = root.querySelectorAll("del");

          expect(dels).toHaveLength(2);
          expect(dels[0]?.textContent).toBe("Strikethrough");
          expect(dels[1]?.textContent).toBe("strikethrough");
        }
      );
    });

    test("inline code", () => {
      assert(
        `
          Inline \`code\`.
        `,
        (root) => {
          const codes = root.querySelectorAll("code");

          expect(codes).toHaveLength(1);
          expect(codes[0]?.textContent).toBe("code");
        }
      );
    });

    test("links", () => {
      assert(
        `
          A [link](https://www.liveblocks.io), [another one](/docs "With a title"),
          https://www.liveblocks.io, and <https://www.liveblocks.io>.
        `,
        (root) => {
          const links = root.querySelectorAll("a");

          expect(links).toHaveLength(4);
          expect(links[0]?.textContent).toBe("link");
          expect(links[0]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[1]?.textContent).toBe("another one");
          expect(links[1]).toHaveAttribute("href", "/docs");
          expect(links[2]?.textContent).toBe("https://www.liveblocks.io");
          expect(links[2]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[3]?.textContent).toBe("https://www.liveblocks.io");
          expect(links[3]).toHaveAttribute("href", "https://www.liveblocks.io");
        }
      );
    });

    test("nested inline elements", () => {
      assert(
        `
        **Bold _italic \`code\`_**, a **bold [link](https://www.liveblocks.io)**, and [one with **bold \`code\`**](#docs "With a title").
      `,
        (root) => {
          const firstInlineElement = root.querySelector("strong:nth-child(1)");

          expect(firstInlineElement?.textContent).toBe("Bold italic code");
          expect(firstInlineElement?.querySelector("em")?.textContent).toBe(
            "italic code"
          );
          expect(firstInlineElement?.querySelector("code")?.textContent).toBe(
            "code"
          );

          const secondInlineElement = root.querySelector("strong:nth-child(2)");

          expect(secondInlineElement?.textContent).toBe("bold link");
          expect(secondInlineElement?.querySelector("a")?.textContent).toBe(
            "link"
          );
          expect(secondInlineElement?.querySelector("a")).toHaveAttribute(
            "href",
            "https://www.liveblocks.io"
          );

          const thirdInlineElement = root.querySelector(
            "a[title='With a title']"
          );
          expect(thirdInlineElement?.textContent).toBe("one with bold code");
          expect(thirdInlineElement).toHaveAttribute("href", "#docs");
          expect(thirdInlineElement?.querySelector("strong")?.textContent).toBe(
            "bold code"
          );
          expect(thirdInlineElement?.querySelector("code")?.textContent).toBe(
            "code"
          );
        }
      );

      assert(
        `
          ***Italic bold***, ****double bold****, and *****italic double bold*****.
        `,
        (root) => {
          const elements = root.querySelectorAll("p > *");

          expect(elements).toHaveLength(3);

          expect(elements[0]?.textContent).toBe("Italic bold");
          expect(elements[0]?.tagName).toBe("EM");
          expect(elements[0]?.querySelector("strong")).toBeInTheDocument();

          expect(elements[1]?.textContent).toBe("double bold");
          expect(elements[1]?.tagName).toBe("STRONG");
          expect(elements[1]?.querySelector("strong")).toBeInTheDocument();

          expect(elements[2]?.textContent).toBe("italic double bold");
          expect(elements[2]?.tagName).toBe("EM");
          expect(elements[2]?.querySelectorAll("strong")).toHaveLength(2);
        }
      );

      assert(
        `
        Inline \`code without **bold**, _italic_, ~~strikethrough~~, and [a link](https://www.liveblocks.io)\`.
      `,
        (root) => {
          const code = root.querySelector("code");

          expect(code?.textContent).toBe(
            "code without **bold**, _italic_, ~~strikethrough~~, and [a link](https://www.liveblocks.io)"
          );
          expect(code?.querySelector("strong")).not.toBeInTheDocument();
          expect(code?.querySelector("em")).not.toBeInTheDocument();
          expect(code?.querySelector("del")).not.toBeInTheDocument();
          expect(code?.querySelector("a")).not.toBeInTheDocument();
        }
      );
    });

    test("ordered lists", () => {
      assert(
        `
          1. A list item
          2. Another list item
          3. Yet another list item
        `,
        (root) => {
          const list = root.querySelector("ol");
          const listItems = list?.querySelectorAll("li");

          expect(list).not.toBeNull();
          expect(listItems).toHaveLength(3);
          expect(listItems?.[0]?.textContent).toBe("A list item");
          expect(listItems?.[1]?.textContent).toBe("Another list item");
          expect(listItems?.[2]?.textContent).toBe("Yet another list item");
        }
      );

      // Ordered lists can have arbitrary starting indices.
      assert(
        `
          1. A numbered list item
          - A "nested" list item
          - Another "nested" list item
          
          2. Another numbered list item
          - A "nested" list item
          - Another "nested" list item
          
          3. Yet another numbered list item
          - A "nested" list item
          - Another "nested" list item
  
          ---
  
          1. A numbered list item
  
          \`\`\`
          const a = 2;
          \`\`\`
  
          2. Another numbered list item
  
          > A quote.
  
          3. Yet another numbered list item
  
          A paragraph.
  
          ---
  
          1. A numbered list item
          1. Another numbered list item
          1. Yet another numbered list item
        `,
        (root) => {
          const listItems = root.querySelectorAll("li");
          expect(listItems).toHaveLength(15);

          // 1. A numbered list item
          // - A "nested" list item
          // - Another "nested" list item
          //
          // 2. Another numbered list item
          // - A "nested" list item
          // - Another "nested" list item
          //
          // 3. Yet another numbered list item
          // - A "nested" list item
          // - Another "nested" list item
          const firstListFirstItem = listItems[0]?.parentElement;
          expect(firstListFirstItem).not.toHaveAttribute("start");
          const firstListSecondItem = listItems[3]?.parentElement;
          expect(firstListSecondItem).toHaveAttribute("start", "2");
          const firstListThirdItem = listItems[6]?.parentElement;
          expect(firstListThirdItem).toHaveAttribute("start", "3");

          // 1. A numbered list item
          //
          // \`\`\`
          // const a = 2;
          // \`\`\`
          //
          // 2. Another numbered list item
          //
          // > A quote.
          //
          // 3. Yet another numbered list item
          //
          // A paragraph.
          const secondListFirstItem = listItems[9]?.parentElement;
          expect(secondListFirstItem).not.toHaveAttribute("start");
          const secondListSecondItem = listItems[10]?.parentElement;
          expect(secondListSecondItem).toHaveAttribute("start", "2");
          const secondListThirdItem = listItems[11]?.parentElement;
          expect(secondListThirdItem).toHaveAttribute("start", "3");

          // 1. A numbered list item
          // 1. Another numbered list item
          // 1. Yet another numbered list item
          const thirdList = document.querySelector("ol:last-of-type");
          expect(listItems[12]?.parentElement).toBe(thirdList);
          expect(listItems[13]?.parentElement).toBe(thirdList);
          expect(listItems[14]?.parentElement).toBe(thirdList);
          expect(thirdList).not.toHaveAttribute("start");
        }
      );
    });

    test("unordered lists", () => {
      assert(
        `
          - A list item
          - Another list item
          - Yet another list item
  
          * A list item
          * Another list item
          * Yet another list item
  
          + A list item
          + Another list item
          + Yet another list item
        `,
        (root) => {
          const lists = root.querySelectorAll("ul");

          lists.forEach((list) => {
            const listItems = list.querySelectorAll("li");

            expect(listItems).toHaveLength(3);
            expect(listItems?.[0]?.textContent).toBe("A list item");
            expect(listItems?.[1]?.textContent).toBe("Another list item");
            expect(listItems?.[2]?.textContent).toBe("Yet another list item");
          });
        }
      );
    });

    test("task lists", () => {
      assert(
        `
          - [ ] A list item
          - [x] Another list item
          - [ ] Yet another list item
        `,
        (root) => {
          const list = root.querySelector("ul");
          const listItems = list?.querySelectorAll("li");

          expect(list).not.toBeNull();
          expect(listItems).toHaveLength(3);
          expect(listItems?.[0]?.textContent).toBe(" A list item");
          expect(
            listItems?.[0]?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
          expect(listItems?.[1]?.textContent).toBe(" Another list item");
          expect(
            listItems?.[1]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
          expect(listItems?.[2]?.textContent).toBe(" Yet another list item");
          expect(
            listItems?.[2]?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
        }
      );
    });

    test("mixed lists", () => {
      assert(
        `
          - A list item
            1. A nested list item
            - Another nested list item
              - [ ] A deeply nested list item
          - Another list item
            1. A nested list item
            2. [x] Another nested list item
        `,
        (root) => {
          const rootList = root.querySelector(":scope > ul");
          expect(rootList).toBeInTheDocument();

          const rootListItems = root.querySelectorAll(":scope > ul > li");
          expect(rootListItems).toHaveLength(2);

          // - A list item
          //   1. A nested list item
          //   - Another nested list item
          //     - [ ] A deeply nested list item
          const firstNestedLists = root?.querySelectorAll(
            ":scope > ul > li:nth-child(1) > :is(ul, ol)"
          );
          expect(firstNestedLists).toHaveLength(2);

          //   1. A nested list item
          const firstNestedFirstList = firstNestedLists?.[0];
          expect(firstNestedFirstList?.tagName).toBe("OL");
          expect(firstNestedFirstList?.childNodes).toHaveLength(1);
          expect(firstNestedFirstList?.childNodes[0]?.textContent).toBe(
            "A nested list item"
          );

          //   - Another nested list item
          //     - [ ] A deeply nested list item
          const firstNestedSecondList = firstNestedLists?.[1];
          expect(firstNestedSecondList?.tagName).toBe("UL");
          expect(firstNestedSecondList?.childNodes).toHaveLength(1);
          expect(
            firstNestedSecondList?.childNodes[0]?.childNodes[0]?.textContent
          ).toBe("Another nested list item");

          //     - [ ] A deeply nested list item
          const firstNestedSecondListFirstNestedList = firstNestedSecondList
            ?.childNodes[0]?.childNodes[1] as HTMLElement | null;
          expect(firstNestedSecondListFirstNestedList?.textContent).toBe(
            " A deeply nested list item"
          );
          expect(firstNestedSecondListFirstNestedList?.tagName).toBe("UL");
          expect(
            firstNestedSecondListFirstNestedList?.querySelector(
              "input[type='checkbox']"
            )
          ).not.toBeChecked();

          // - Another list item
          //   1. A nested list item
          //   2. [x] Another nested list item
          const secondNestedList = root?.querySelector(
            ":scope > ul > li:nth-child(2) > :is(ul, ol)"
          );
          expect(secondNestedList?.tagName).toBe("OL");
          expect(secondNestedList?.childNodes).toHaveLength(2);
          expect(secondNestedList?.childNodes[0]?.textContent).toBe(
            "A nested list item"
          );
          expect(secondNestedList?.childNodes[1]?.textContent).toBe(
            " Another nested list item"
          );
          expect(
            (
              secondNestedList?.childNodes[1] as HTMLElement | null
            )?.querySelector("input[type='checkbox']")
          ).toBeChecked();
        }
      );
    });

    test("loose lists", () => {
      assert(
        `
          - A list item
  
          - Another list item with
  
            multiple paragraphs.
  
          - [x] A task list item with
  
            > a quote and a code block
  
            \`\`\`
            const a = 2;
            \`\`\`
        `,
        (root) => {
          const list = root.querySelector("ul");
          expect(list).toBeInTheDocument();

          const listItems = list?.querySelectorAll("li");
          expect(listItems).toHaveLength(3);

          expect(listItems?.[0]?.textContent).toBe("A list item");

          expect(listItems?.[1]?.innerHTML).toEqual(
            "<p>Another list item with</p><p>multiple paragraphs.</p>"
          );

          expect(listItems?.[2]?.textContent).toContain(
            " A task list item with"
          );
          expect(
            listItems?.[2]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
          expect(listItems?.[2]?.querySelector("blockquote")?.textContent).toBe(
            "a quote and a code block"
          );
          expect(listItems?.[2]?.querySelector("pre")?.textContent).toBe(
            "const a = 2;"
          );
        }
      );
    });

    test("blockquotes", () => {
      assert(
        `
          > A blockquote.
  
          > Another one which spans
          >
          > multiple paragraphs.
  
          > Yet another which
          >
          > > is nested.
        `,
        (root) => {
          const blockquotes = root.querySelectorAll(":scope >blockquote");

          expect(blockquotes).toHaveLength(3);
          expect(blockquotes[0]?.textContent).toBe("A blockquote.");

          const blockquote1Paragraphs = blockquotes[1]?.querySelectorAll("p");
          expect(blockquote1Paragraphs).toHaveLength(2);
          expect(blockquote1Paragraphs?.[0]?.textContent).toBe(
            "Another one which spans"
          );
          expect(blockquote1Paragraphs?.[1]?.textContent).toBe(
            "multiple paragraphs."
          );

          expect(blockquotes[2]?.childNodes[0]?.textContent).toBe(
            "Yet another which"
          );

          const blockquote2NestedBlockquote = blockquotes[2]
            ?.childNodes[1] as HTMLElement | null;
          expect(blockquote2NestedBlockquote?.tagName).toBe("BLOCKQUOTE");
          expect(blockquote2NestedBlockquote?.childNodes[0]?.textContent).toBe(
            "is nested."
          );
        }
      );
    });

    test("code blocks", () => {
      assert(
        `
          \`\`\`
          p {
            color: #000;
          }
          \`\`\`
  
          \`\`\`javascript
          const a = 2;
          \`\`\`
        `,
        (root) => {
          const codeBlocks = root.querySelectorAll("pre");

          expect(codeBlocks).toHaveLength(2);
          expect(codeBlocks[0]?.textContent).toBe("p {\n  color: #000;\n}");
          expect(codeBlocks[1]?.textContent).toBe("const a = 2;");
        }
      );
    });

    test("images", () => {
      assert(
        `
          ![An image](https://www.liveblocks.io/favicon.svg)
        `,
        (root) => {
          const images = root.querySelectorAll("img");

          expect(images).toHaveLength(1);
          expect(images[0]).toHaveAttribute(
            "src",
            "https://www.liveblocks.io/favicon.svg"
          );
        }
      );
    });

    test("tables", () => {
      assert(
        `
          | A column heading | Another column heading |
          |------------------|------------------------|
          | A cell           | Another cell           |
          | A cell           | Another cell           |
        `,
        (root) => {
          const table = root.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]?.textContent).toBe("A column heading");
          expect(tableHeadings?.[1]?.textContent).toBe(
            "Another column heading"
          );

          const tableRows = table?.querySelectorAll("tbody tr");
          expect(tableRows).toHaveLength(2);

          tableRows?.forEach((row) => {
            const cells = row.querySelectorAll("td");

            expect(cells).toHaveLength(2);
            expect(cells?.[0]?.textContent).toBe("A cell");
            expect(cells?.[1]?.textContent).toBe("Another cell");
          });
        }
      );

      assert(
        `
          | A column heading | Another column heading |
          |------------------|------------------------|
          | A cell           |                        |
          |                  | Another cell           |
        `,
        (root) => {
          const table = root.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]?.textContent).toBe("A column heading");
          expect(tableHeadings?.[1]?.textContent).toBe(
            "Another column heading"
          );

          const tableRows = table?.querySelectorAll("tbody tr");
          expect(tableRows).toHaveLength(2);

          const firstRowCells = tableRows?.[0]?.querySelectorAll("td");
          expect(firstRowCells).toHaveLength(2);
          expect(firstRowCells?.[0]?.textContent).toBe("A cell");
          expect(firstRowCells?.[1]?.textContent).toBe("");

          const secondRowCells = tableRows?.[1]?.querySelectorAll("td");
          expect(secondRowCells).toHaveLength(2);
          expect(secondRowCells?.[0]?.textContent).toBe("");
          expect(secondRowCells?.[1]?.textContent).toBe("Another cell");
        }
      );
    });

    test("horizontal rules", () => {
      assert(
        `
          ***
  
          ---
  
          _____
        `,
        (root) => {
          expect(root.querySelectorAll("hr")).toHaveLength(3);
        }
      );
    });

    test("escaped characters", () => {
      assert(
        `
          \\*Not italic\\* and \\[not a link\\]\\(https://liveblocks.io).
        `,
        (root) => {
          expect(root.textContent).toBe(
            "*Not italic* and [not a link](https://liveblocks.io)."
          );
        }
      );
    });

    test("HTML entities", () => {
      assert(
        `
          &lt;p&gt; &amp; paste&copy
  
          > &quot; &apos;
  
          - &copy; &trade;
        `,
        (root) => {
          expect(root.querySelector("p")?.textContent).toBe("<p> & paste&copy");
          expect(root.querySelector("blockquote")?.textContent).toBe("\" '");
          expect(root.querySelector("li")?.textContent).toBe("© ™");
        }
      );
    });

    test("HTML elements as plain text", () => {
      assert(
        `
          The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.
  
          Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.
  
          This <mark>text is highlighted</mark>.
  
          E = mc<sup>2</sup>
        `,
        (root) => {
          const paragraphs = root.querySelectorAll("p");
          expect(paragraphs).toHaveLength(4);

          expect(paragraphs[0]?.textContent).toBe(
            'The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.'
          );
          expect(paragraphs[1]?.textContent).toBe(
            "Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy."
          );
          expect(paragraphs[2]?.textContent).toBe(
            "This <mark>text is highlighted</mark>."
          );
          expect(paragraphs[3]?.textContent).toBe("E = mc<sup>2</sup>");
        }
      );
    });
  });

  test("should handle different newlines", () => {
    const content =
      "# Heading 1\n\nA paragraph\r\r---\r\n\r\nAnother paragraph";

    const { getByTestId } = render(
      <Markdown data-testid="markdown" content={content} />
    );
    const { getByTestId: getByTestIdPartial } = render(
      <Markdown data-testid="markdown-partial" content={content} partial />
    );

    const root = getByTestId("markdown");
    const rootPartial = getByTestIdPartial("markdown-partial");
    const roots = [root, rootPartial];

    for (const root of roots) {
      expect(root.querySelector("h1")?.textContent).toBe("Heading 1");

      const paragraphs = root.querySelectorAll("p");
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]?.textContent).toBe("A paragraph");
      expect(paragraphs[1]?.textContent).toBe("Another paragraph");

      expect(root.querySelector("hr")).toBeInTheDocument();
    }
  });

  test("should only modify the last block when handling partial content", () => {
    function assert(content: string, assertions: (root: HTMLElement) => void) {
      const { getByTestId, unmount } = render(
        <Markdown data-testid="markdown" content={dedent(content)} partial />
      );

      assertions(getByTestId("markdown"));
      unmount();
    }

    assert(
      `
        A paragraph without **bold

        Another paragraph
      `,
      (root) => {
        const paragraphs = root.querySelectorAll("p");
        expect(paragraphs).toHaveLength(2);

        expect(paragraphs[0]?.textContent).toBe("A paragraph without **bold");
        expect(paragraphs[0]?.querySelector("strong")).not.toBeInTheDocument();
        expect(paragraphs[1]?.textContent).toBe("Another paragraph");
      }
    );

    assert(
      `
        - A list item 👋
        - Another list item with **bold
      `,
      (root) => {
        const listItems = root.querySelectorAll("li");
        expect(listItems).toHaveLength(2);

        expect(listItems[0]?.textContent).toBe("A list item 👋");
        expect(listItems[1]?.textContent).toBe("Another list item with bold");
        expect(listItems[1]?.querySelector("strong")?.textContent).toBe("bold");
      }
    );
  });

  test("should rerender when enabling or disabling partial content", () => {
    const { getByTestId, rerender } = render(
      <Markdown data-testid="markdown" content="A [link" />
    );

    const root = getByTestId("markdown");

    expect(root.textContent).toBe("A [link");
    expect(root.querySelector("a")).not.toBeInTheDocument();

    rerender(<Markdown data-testid="markdown" content="A [link" partial />);

    expect(root.textContent).toBe("A link");
    expect(root.querySelector("a")?.textContent).toBe("link");

    rerender(<Markdown data-testid="markdown" content="A [link" />);

    expect(root.textContent).toBe("A [link");
    expect(root.querySelector("a")).not.toBeInTheDocument();
  });

  describe("should handle partial…", () => {
    function assert(content: string, assertions: (root: HTMLElement) => void) {
      const { getByTestId, unmount } = render(
        <Markdown data-testid="markdown" content={dedent(content)} partial />
      );

      assertions(getByTestId("markdown"));
      unmount();
    }

    test("headings", () => {
      assert(
        `
        ###
      `,
        (root) => {
          expect(root.querySelector("h3")?.textContent).toBe("");
        }
      );

      assert(
        `
        No heading
        =
      `,
        (root) => {
          expect(root.querySelector("h1")).not.toBeInTheDocument();
          expect(root.textContent).toBe("No heading");
        }
      );

      assert(
        `
        No heading
        ==
      `,
        (root) => {
          expect(root.querySelector("h1")).not.toBeInTheDocument();
          expect(root.textContent).toBe("No heading");
        }
      );

      assert(
        `
        Heading 1
        ===
      `,
        (root) => {
          expect(root.querySelector("h1")?.textContent).toBe("Heading 1");
        }
      );

      assert(
        `
        No heading
        -
      `,
        (root) => {
          expect(root.querySelector("h2")).not.toBeInTheDocument();
          expect(root.textContent).toBe("No heading");
        }
      );

      assert(
        `
        No heading
        --
      `,
        (root) => {
          expect(root.querySelector("h2")).not.toBeInTheDocument();
          expect(root.textContent).toBe("No heading");
        }
      );

      assert(
        `
        Heading 2
        ---
      `,
        (root) => {
          expect(root.querySelector("h2")?.textContent).toBe("Heading 2");
        }
      );
    });

    test("bold text", () => {
      assert(
        `
        Not **
      `,
        (root) => {
          expect(root.textContent).toBe("Not ");
        }
      );

      assert(
        `
        Not __
      `,
        (root) => {
          expect(root.textContent).toBe("Not ");
        }
      );

      assert(
        `
        **Bold text
      `,
        (root) => {
          expect(root.querySelector("strong")?.textContent).toBe("Bold text");
        }
      );

      assert(
        `
        __Bold text
      `,
        (root) => {
          expect(root.querySelector("strong")?.textContent).toBe("Bold text");
        }
      );
    });

    test("italic text", () => {
      assert(
        `
        Not *
      `,
        (root) => {
          expect(root.textContent).toBe("Not ");
        }
      );

      assert(
        `
        Not _
      `,
        (root) => {
          expect(root.textContent).toBe("Not ");
        }
      );

      assert(
        `
        *Italic text
      `,
        (root) => {
          expect(root.querySelector("em")?.textContent).toBe("Italic text");
        }
      );

      assert(
        `
        _Italic text
      `,
        (root) => {
          expect(root.querySelector("em")?.textContent).toBe("Italic text");
        }
      );
    });

    test("strikethrough text", () => {
      assert(
        `
        Not ~
      `,
        (root) => {
          expect(root.textContent).toBe("Not ");
        }
      );

      assert(
        `
        Not ~~
      `,
        (root) => {
          expect(root.textContent).toBe("Not ");
        }
      );

      assert(
        `
        ~Strikethrough text
      `,
        (root) => {
          expect(root.querySelector("del")?.textContent).toBe(
            "Strikethrough text"
          );
        }
      );

      assert(
        `
        ~~Strikethrough text
      `,
        (root) => {
          expect(root.querySelector("del")?.textContent).toBe(
            "Strikethrough text"
          );
        }
      );
    });

    test("inline code", () => {
      assert(
        `
        Not inline \`
      `,
        (root) => {
          expect(root?.textContent).toBe("Not inline ");
        }
      );

      assert(
        `
        Inline \`code
      `,
        (root) => {
          expect(root.querySelector("code")?.textContent).toBe("code");
        }
      );
    });

    test("links", () => {
      assert(
        `
        A [
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link?.textContent).toBe("");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        `
        A [li
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link?.textContent).toBe("li");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        `
        A [link]
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link?.textContent).toBe("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        `
        Not a [link],
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link).not.toBeInTheDocument();
          expect(root.textContent).toBe("Not a [link],");
        }
      );

      assert(
        `
        A [link](http
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link?.textContent).toBe("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        `
        A [link](https://www.liveblocks.io
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link?.textContent).toBe("link");
          expect(link).toHaveAttribute("href", "https://www.liveblocks.io");
        }
      );

      // Links can have titles.
      assert(
        `
        A [link](https://www.liveblocks.io "Liveblocks
      `,
        (root) => {
          const link = root.querySelector("a");

          expect(link?.textContent).toBe("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      // Footnotes aren't links.
      assert(
        `
        Not a [^
      `,
        (root) => {
          expect(root.querySelector("a")).not.toBeInTheDocument();
        }
      );

      assert(
        `
        Not a [^1
      `,
        (root) => {
          expect(root.querySelector("a")).not.toBeInTheDocument();
        }
      );
    });

    test("nested inline elements", () => {
      assert(
        `
        **Bold _italic \`code
      `,
        (root) => {
          const strong = root.querySelector("strong");
          const em = strong?.querySelector("em");
          const code = em?.querySelector("code");

          expect(strong?.textContent).toBe("Bold italic code");
          expect(em?.textContent).toBe("italic code");
          expect(code?.textContent).toBe("code");
        }
      );

      assert(
        `
        **Bold _italic_ \`code
      `,
        (root) => {
          const strong = root.querySelector("strong");
          const em = strong?.querySelector("em");
          const code = strong?.querySelector("code");

          expect(strong?.textContent).toBe("Bold italic code");
          expect(em?.textContent).toBe("italic");
          expect(code?.textContent).toBe("code");
        }
      );

      assert(
        `
        A **bold [link
      `,
        (root) => {
          const strong = root.querySelector("strong");
          const link = strong?.querySelector("a");

          expect(strong?.textContent).toBe("bold link");
          expect(link?.textContent).toBe("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        `
        A [link with \`code
      `,
        (root) => {
          const link = root.querySelector("a");
          const code = link?.querySelector("code");

          expect(link?.textContent).toBe("link with code");
          expect(link).toHaveAttribute("href", "#");
          expect(code?.textContent).toBe("code");
        }
      );

      assert(
        `
        A [link with **bold \`code\`
      `,
        (root) => {
          const link = root.querySelector("a");
          const strong = link?.querySelector("strong");
          const code = strong?.querySelector("code");

          expect(link?.textContent).toBe("link with bold code");
          expect(link).toHaveAttribute("href", "#");
          expect(strong?.textContent).toBe("bold code");
          expect(code?.textContent).toBe("code");
        }
      );

      assert(
        `
        Inline \`code but not **bold
      `,
        (root) => {
          const code = root.querySelector("code");
          const strong = code?.querySelector("strong");

          expect(code?.textContent).toBe("code but not **bold");
          expect(strong).not.toBeInTheDocument();
        }
      );

      assert(
        `
        Inline \`code but not _italic
      `,
        (root) => {
          const code = root.querySelector("code");
          const em = code?.querySelector("em");

          expect(code?.textContent).toBe("code but not _italic");
          expect(em).not.toBeInTheDocument();
        }
      );

      assert(
        `
        Inline \`code but not ~~strikethrough
      `,
        (root) => {
          const code = root.querySelector("code");
          const del = code?.querySelector("del");

          expect(code?.textContent).toBe("code but not ~~strikethrough");
          expect(del).not.toBeInTheDocument();
        }
      );

      assert(
        `
        Inline \`code but not a [link
      `,
        (root) => {
          const code = root.querySelector("code");
          const link = code?.querySelector("a");

          expect(code?.textContent).toBe("code but not a [link");
          expect(link).not.toBeInTheDocument();
        }
      );

      assert(
        `
        ***Three
      `,
        (root) => {
          const em = root.querySelector("em");
          const strong = em?.querySelector("strong");

          expect(root.textContent).toBe("Three");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("Three");
        }
      );

      assert(
        `
        ***Three***
      `,
        (root) => {
          const em = root.querySelector("em");
          const strong = em?.querySelector("strong");

          expect(root.textContent).toBe("Three");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("Three");
        }
      );

      assert(
        `
        ***Three***,
      `,
        (root) => {
          const em = root.querySelector("em");
          const strong = em?.querySelector("strong");

          expect(root.textContent).toBe("Three,");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("Three");
        }
      );

      assert(
        `
        ***Three***, ****four
      `,
        (root) => {
          const em = root.querySelector("p > em");
          const strong = root.querySelector("p > strong");

          expect(root.textContent).toBe("Three, four");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("four");
          expect(strong?.querySelector("strong")?.textContent).toBe("four");
        }
      );

      assert(
        `
        ****Four
      `,
        (root) => {
          const strongs = root.querySelectorAll("strong");

          expect(strongs).toHaveLength(2);
          expect(strongs[0]?.textContent).toBe("Four");
          expect(strongs[1]?.textContent).toBe("Four");
          expect(root.textContent).toBe("Four");
        }
      );

      assert(
        `
        *****Five
      `,
        (root) => {
          const em = root.querySelector("em");
          const strongs = em?.querySelectorAll("strong");

          expect(root.textContent).toBe("Five");
          expect(em?.textContent).toBe("Five");
          expect(strongs).toHaveLength(2);
          expect(strongs?.[0]?.textContent).toBe("Five");
          expect(strongs?.[1]?.textContent).toBe("Five");
        }
      );

      assert(
        `
        ___Three
      `,
        (root) => {
          const em = root.querySelector("em");
          const strong = em?.querySelector("strong");

          expect(root.textContent).toBe("Three");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("Three");
        }
      );

      assert(
        `
        ___Three___
      `,
        (root) => {
          const em = root.querySelector("em");
          const strong = em?.querySelector("strong");

          expect(root.textContent).toBe("Three");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("Three");
        }
      );

      assert(
        `
        ___Three___,
      `,
        (root) => {
          const em = root.querySelector("em");
          const strong = em?.querySelector("strong");

          expect(root.textContent).toBe("Three,");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("Three");
        }
      );

      assert(
        `
        ___Three___, ____four
      `,
        (root) => {
          const em = root.querySelector("p > em");
          const strong = root.querySelector("p > strong");

          expect(root.textContent).toBe("Three, four");
          expect(em?.textContent).toBe("Three");
          expect(strong?.textContent).toBe("four");
          expect(strong?.querySelector("strong")?.textContent).toBe("four");
        }
      );

      assert(
        `
        ____Four
      `,
        (root) => {
          const strongs = root.querySelectorAll("strong");

          expect(strongs).toHaveLength(2);
          expect(strongs[0]?.textContent).toBe("Four");
          expect(strongs[1]?.textContent).toBe("Four");
          expect(root.textContent).toBe("Four");
        }
      );

      assert(
        `
        _____Five
      `,
        (root) => {
          const em = root.querySelector("em");
          const strongs = em?.querySelectorAll("strong");

          expect(root.textContent).toBe("Five");
          expect(em?.textContent).toBe("Five");
          expect(strongs).toHaveLength(2);
          expect(strongs?.[0]?.textContent).toBe("Five");
          expect(strongs?.[1]?.textContent).toBe("Five");
        }
      );
    });

    test("lists", () => {
      assert(
        `
        -
      `,
        (root) => {
          expect(root?.textContent).toBe("");
        }
      );

      assert(
        `
        - A list item
      `,
        (root) => {
          expect(root.querySelector("li")?.textContent).toBe("A list item");
        }
      );

      assert(
        `
        1
      `,
        (root) => {
          expect(root?.textContent).toBe("");
        }
      );

      assert(
        `
        1. A list item
      `,
        (root) => {
          expect(root.querySelector("li")?.textContent).toBe("A list item");
        }
      );

      assert(
        `
        - [
      `,
        (root) => {
          expect(
            root.querySelector("li")?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
        }
      );

      assert(
        `
        - [ ]
      `,
        (root) => {
          expect(
            root.querySelector("li")?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
        }
      );

      assert(
        `
        - [x
      `,
        (root) => {
          expect(
            root.querySelector("li")?.querySelector("input[type='checkbox']")
          ).toBeChecked();
        }
      );

      assert(
        `
        - [x]
      `,
        (root) => {
          expect(
            root.querySelector("li")?.querySelector("input[type='checkbox']")
          ).toBeChecked();
        }
      );
    });

    test("images", () => {
      assert(
        `
        Not an image: !
      `,
        (root) => {
          expect(root.querySelector("img")).not.toBeInTheDocument();
          expect(root?.textContent).toBe("Not an image: ");
        }
      );

      assert(
        `
        Not an image: ![
      `,
        (root) => {
          expect(root.querySelector("img")).not.toBeInTheDocument();
          expect(root?.textContent).toBe("Not an image: ");
        }
      );

      assert(
        `
        Not an image: ![image
      `,
        (root) => {
          expect(root.querySelector("img")).not.toBeInTheDocument();
          expect(root?.textContent).toBe("Not an image: ");
        }
      );

      assert(
        `
        Not an image: ![image](https://www.liveblocks.io/favicon.svg
      `,
        (root) => {
          expect(root.querySelector("img")).not.toBeInTheDocument();
          expect(root?.textContent).toBe("Not an image: ");
        }
      );

      assert(
        `
        Not an image: ![](https://www.liveblocks.io/favicon.svg
      `,
        (root) => {
          expect(root.querySelector("img")).not.toBeInTheDocument();
          expect(root?.textContent).toBe("Not an image: ");
        }
      );

      assert(
        `
        An image: ![image](https://www.liveblocks.io/favicon.svg)
      `,
        (root) => {
          const image = root.querySelector("img");

          expect(image).toHaveAttribute(
            "src",
            "https://www.liveblocks.io/favicon.svg"
          );
          expect(image).toHaveAttribute("alt", "image");
          expect(root?.textContent).toBe("An image: ");
        }
      );

      assert(
        `
        An image: ![](https://www.liveblocks.io/favicon.svg)
      `,
        (root) => {
          const image = root.querySelector("img");

          expect(image).toHaveAttribute(
            "src",
            "https://www.liveblocks.io/favicon.svg"
          );
          expect(image).toHaveAttribute("alt", "");
          expect(root?.textContent).toBe("An image: ");
        }
      );
    });

    test("code blocks", () => {
      assert(
        `
        \`\`
      `,
        (root) => {
          expect(root?.textContent).toBe("");
        }
      );

      assert(
        `
        \`\`\`
      `,
        (root) => {
          expect(root?.textContent).toBe("");
        }
      );

      assert(
        `
        \`\`\`css
      `,
        (root) => {
          const codeBlock = root.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock).toHaveAttribute("data-language", "css");
          expect(codeBlock?.textContent).toBe(" ");
        }
      );

      assert(
        `
        \`\`\`css
        p {
          color: #000;
      `,
        (root) => {
          const codeBlock = root.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock?.querySelector("code")?.innerHTML).toBe(
            "p {\n  color: #000;"
          );
          expect(codeBlock).toHaveAttribute("data-language", "css");
        }
      );

      // Code blocks shouldn't be completed/changed.
      // In this case, the ending looks like a partial link.
      assert(
        `
        \`\`\`
        const [count, setCount
      `,
        (root) => {
          const codeBlock = root.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock?.querySelector("code")?.innerHTML).toBe(
            "const [count, setCount"
          );
          expect(codeBlock).toHaveAttribute("data-language", "");
        }
      );

      assert(
        `
        \`\`\`css
        p {
          color: #000;
        }
        \`\`
      `,
        (root) => {
          const codeBlock = root.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock?.querySelector("code")?.innerHTML).toBe(
            "p {\n  color: #000;\n}"
          );
          expect(codeBlock).toHaveAttribute("data-language", "css");
        }
      );

      assert(
        `
        \`\`\`css
        p {
          color: #000;
        }
        \`\`\`
      `,
        (root) => {
          const codeBlock = root.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock?.querySelector("code")?.innerHTML).toBe(
            "p {\n  color: #000;\n}"
          );
          expect(codeBlock).toHaveAttribute("data-language", "css");
        }
      );
    });

    test("tables", () => {
      assert(
        `
        Not a table |
      `,
        (root) => {
          expect(root?.textContent).toBe("Not a table |");
        }
      );
      assert(
        `
        | A column heading
      `,
        (root) => {
          const table = root.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(1);
          expect(tableHeadings?.[0]?.textContent).toBe("A column heading");
        }
      );

      assert(
        `
        | A column heading | Another column
      `,
        (root) => {
          const table = root.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]?.textContent).toBe("A column heading");
          expect(tableHeadings?.[1]?.textContent).toBe("Another column");
        }
      );

      assert(
        `
        | A column heading | Another column heading |
        |------------------|
      `,
        (root) => {
          const table = root.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]?.textContent).toBe("A column heading");
          expect(tableHeadings?.[1]?.textContent).toBe(
            "Another column heading"
          );
        }
      );

      assert(
        `
        A paragraph

          | A column heading | Another column heading |
          |------------------|
      `,
        (root) => {
          const table = root.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]?.textContent).toBe("A column heading");
          expect(tableHeadings?.[1]?.textContent).toBe(
            "Another column heading"
          );
        }
      );
    });

    test("horizontal rules", () => {
      assert(
        `
        A paragraph

        -
      `,
        (root) => {
          expect(root?.textContent).toBe("A paragraph");
        }
      );

      assert(
        `
        A paragraph

        _
      `,
        (root) => {
          expect(root?.textContent).toBe("A paragraph");
        }
      );

      assert(
        `
        A paragraph

        --
      `,
        (root) => {
          expect(root?.textContent).toBe("A paragraph");
        }
      );

      assert(
        `
        A paragraph

        __
      `,
        (root) => {
          expect(root?.textContent).toBe("A paragraph");
        }
      );

      assert(
        `
        A paragraph

        ---

        Another paragraph
      `,
        (root) => {
          expect(root.querySelector("hr")).toBeInTheDocument();
        }
      );

      assert(
        `
        A paragraph

        ___

        Another paragraph
      `,
        (root) => {
          expect(root.querySelector("hr")).toBeInTheDocument();
        }
      );
    });

    test("escaped characters", () => {
      assert(
        `
        A paragraph \\
      `,
        (root) => {
          expect(root?.textContent).toBe("A paragraph ");
        }
      );

      assert(
        `
        A paragraph \\~
      `,
        (root) => {
          expect(root?.textContent).toBe("A paragraph ~");
        }
      );
    });

    test("HTML elements", () => {
      assert(
        `
          The abbreviation for HyperText Markup Language is <
        `,
        (root) => {
          expect(root?.textContent).toBe(
            "The abbreviation for HyperText Markup Language is "
          );
        }
      );

      assert(
        `
          The abbreviation for HyperText Markup Language is <abbr title="
        `,
        (root) => {
          expect(root?.textContent).toBe(
            'The abbreviation for HyperText Markup Language is <abbr title="'
          );
        }
      );

      assert(
        `
          The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HT
        `,
        (root) => {
          expect(root?.textContent).toBe(
            'The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HT'
          );
        }
      );

      assert(
        `
          The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.
        `,
        (root) => {
          expect(root?.textContent).toBe(
            'The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.'
          );
        }
      );
    });

    test("emojis", () => {
      assert(
        `
        An emoji 👋
      `,
        (root) => {
          expect(root?.textContent).toBe("An emoji ");
        }
      );

      assert(
        `
        A skin tone sequence emoji 👋🏽
      `,
        (root) => {
          expect(root?.textContent).toBe("A skin tone sequence emoji ");
        }
      );

      assert(
        `
        A partial sequence emoji 👋\u200D
      `,
        (root) => {
          expect(root?.textContent).toBe("A partial sequence emoji ");
        }
      );

      assert(
        `
        An umbrella as a pictographic ☂
      `,
        (root) => {
          expect(root?.textContent).toBe("An umbrella as a pictographic ☂");
        }
      );

      assert(
        `
        An umbrella as an emoji ☂️
      `,
        (root) => {
          expect(root?.textContent).toBe("An umbrella as an emoji ");
        }
      );

      assert(
        `
        A partial flag emoji 🇺
      `,
        (root) => {
          expect(root?.textContent).toBe("A partial flag emoji ");
        }
      );

      assert(
        `
        A flag emoji 🇺🇳
      `,
        (root) => {
          expect(root?.textContent).toBe("A flag emoji ");
        }
      );

      assert(
        `
        A keycap sequence emoji 1️⃣
      `,
        (root) => {
          expect(root?.textContent).toBe("A keycap sequence emoji ");
        }
      );

      assert(
        `
        An emoji 👋 and some text
      `,
        (root) => {
          expect(root?.textContent).toBe("An emoji 👋 and some text");
        }
      );
    });
  });

  describe("should support custom…", () => {
    function assert(
      content: string,
      components: Partial<MarkdownComponents>,
      assertions: (root: HTMLElement) => void
    ) {
      const { getByTestId, unmount } = render(
        <Markdown
          data-testid="markdown"
          content={dedent(content)}
          components={components}
        />
      );

      assertions(getByTestId("markdown"));
      unmount();
    }

    test("paragraphs", () => {
      assert(
        `
          A paragraph
        `,
        {
          Paragraph: ({ children }) => <p data-paragraph>{children}</p>,
        },
        (root) => {
          const paragraph = root.querySelector("p");

          expect(paragraph?.textContent).toBe("A paragraph");
          expect(paragraph).toHaveAttribute("data-paragraph");
        }
      );
    });

    test("headings", () => {
      assert(
        `
          # Heading 1
  
          ## Heading 2
  
          ### Heading 3
  
          #### Heading 4
  
          ##### Heading 5
  
          ###### Heading 6
        `,
        {
          Heading: ({ children, level }) => {
            const Heading = `h${level}` as const;

            return <Heading data-heading={level}>{children}</Heading>;
          },
        },
        (root) => {
          const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
          expect(headings).toHaveLength(6);

          headings.forEach((heading, index) => {
            expect(heading).toHaveAttribute("data-heading", String(index + 1));
            expect(heading.textContent).toBe(`Heading ${index + 1}`);
          });
        }
      );
    });

    test("inline elements", () => {
      assert(
        `
          **Bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, and **\`bold inline code\`**.
        `,
        {
          Inline: ({ children, type }) => {
            const Inline = type;

            return <Inline data-inline={type}>{children}</Inline>;
          },
        },
        (root) => {
          const strongs = root.querySelectorAll("strong");
          expect(strongs).toHaveLength(3);
          expect(strongs[0]?.textContent).toBe("Bold text");
          expect(strongs[0]).toHaveAttribute("data-inline", "strong");
          expect(strongs[1]?.textContent).toBe("bold and italic");
          expect(strongs[1]).toHaveAttribute("data-inline", "strong");
          expect(strongs[2]?.textContent).toBe("bold inline code");
          expect(strongs[2]).toHaveAttribute("data-inline", "strong");

          const italics = root.querySelectorAll("em");
          expect(italics).toHaveLength(2);
          expect(italics[0]?.textContent).toBe("italic text");
          expect(italics[0]).toHaveAttribute("data-inline", "em");
          expect(italics[1]?.textContent).toBe("bold and italic");
          expect(italics[1]).toHaveAttribute("data-inline", "em");

          const strikethroughs = root.querySelectorAll("del");
          expect(strikethroughs).toHaveLength(1);
          expect(strikethroughs[0]?.textContent).toBe("strikethrough");
          expect(strikethroughs[0]).toHaveAttribute("data-inline", "del");

          const codes = root.querySelectorAll("code");
          expect(codes).toHaveLength(2);
          expect(codes[0]?.textContent).toBe("inline code");
          expect(codes[0]).toHaveAttribute("data-inline", "code");
          expect(codes[1]?.textContent).toBe("bold inline code");
          expect(codes[1]).toHaveAttribute("data-inline", "code");
        }
      );
    });

    test("links", () => {
      assert(
        `
          A [link](https://www.liveblocks.io), [another one](/docs "With a title"),
          https://www.liveblocks.io, and <https://www.liveblocks.io>.
        `,
        {
          Link: ({ href, title, children }) => (
            <a href={href} title={title} data-link>
              {children}
            </a>
          ),
        },
        (root) => {
          const links = root.querySelectorAll("a");
          expect(links).toHaveLength(4);

          expect(links[0]).toHaveAttribute("data-link");
          expect(links[0]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[0]?.textContent).toBe("link");

          expect(links[1]).toHaveAttribute("data-link");
          expect(links[1]).toHaveAttribute("href", "/docs");
          expect(links[1]).toHaveAttribute("title", "With a title");
          expect(links[1]?.textContent).toBe("another one");

          expect(links[2]).toHaveAttribute("data-link");
          expect(links[2]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[2]?.textContent).toBe("https://www.liveblocks.io");

          expect(links[3]).toHaveAttribute("data-link");
          expect(links[3]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[3]?.textContent).toBe("https://www.liveblocks.io");
        }
      );
    });

    test("lists", () => {
      assert(
        `
          - A list item
            1. A list item
            2. Another list item
            3. Yet another list item
          - Another list item
            - [ ] A task list item
            - [x] A completed task list item
            - [x] Another completed task list item
          - Yet another list item
            1. A list item
            * Another list item
            + [x] Yet another list item
        `,
        {
          List: ({ items, type, start }) => {
            const List = type === "ordered" ? "ol" : "ul";

            return (
              <List start={start} data-list={type}>
                {items.map((item, index) => (
                  <li key={index}>{item.children}</li>
                ))}
              </List>
            );
          },
        },
        (root) => {
          const rootList = root.querySelector(":scope > ul");
          expect(rootList).toHaveAttribute("data-list");

          const rootListItems = root.querySelectorAll(":scope > ul > li");
          expect(rootListItems).toHaveLength(3);

          expect(rootListItems[0]?.textContent).toContain("A list item");

          const firstNestedList = rootListItems[0]?.querySelector("ol");
          expect(firstNestedList).toHaveAttribute("data-list");

          const firstNestedListItems = firstNestedList?.querySelectorAll("li");
          expect(firstNestedListItems).toHaveLength(3);

          expect(firstNestedListItems?.[0]?.textContent).toBe("A list item");
          expect(firstNestedListItems?.[1]?.textContent).toBe(
            "Another list item"
          );
          expect(firstNestedListItems?.[2]?.textContent).toBe(
            "Yet another list item"
          );

          const secondRootListItem = rootListItems[1];
          expect(secondRootListItem?.textContent).toContain(
            "Another list item"
          );

          const secondNestedList = secondRootListItem?.querySelector("ul");
          expect(secondNestedList).toHaveAttribute("data-list");

          const secondNestedListItems =
            secondNestedList?.querySelectorAll("li");
          expect(secondNestedListItems).toHaveLength(3);

          expect(secondNestedListItems?.[0]?.textContent).toBe(
            " A task list item"
          );
          expect(
            secondNestedListItems?.[0]?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
          expect(secondNestedListItems?.[1]?.textContent).toBe(
            " A completed task list item"
          );
          expect(
            secondNestedListItems?.[1]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
          expect(secondNestedListItems?.[2]?.textContent).toBe(
            " Another completed task list item"
          );
          expect(
            secondNestedListItems?.[2]?.querySelector("input[type='checkbox']")
          ).toBeChecked();

          const thirdRootListItem = rootListItems[2];
          expect(thirdRootListItem?.textContent).toContain(
            "Yet another list item"
          );

          const thirdNestedLists =
            thirdRootListItem?.querySelectorAll("ol, ul");
          expect(thirdNestedLists).toHaveLength(3);

          expect(thirdNestedLists?.[0]).toHaveAttribute("data-list", "ordered");
          expect(thirdNestedLists?.[0]?.querySelector("li")?.textContent).toBe(
            "A list item"
          );

          expect(thirdNestedLists?.[1]).toHaveAttribute(
            "data-list",
            "unordered"
          );
          expect(thirdNestedLists?.[1]?.querySelector("li")?.textContent).toBe(
            "Another list item"
          );

          expect(thirdNestedLists?.[2]).toHaveAttribute(
            "data-list",
            "unordered"
          );
          expect(thirdNestedLists?.[2]?.querySelector("li")?.textContent).toBe(
            " Yet another list item"
          );
          expect(
            thirdNestedLists?.[2]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
        }
      );
    });

    test("blockquotes", () => {
      assert(
        `
          > A blockquote.
  
          > Another one which spans
          >
          > multiple paragraphs.
  
          > Yet another which
          >
          > > is nested.
        `,
        {
          Blockquote: ({ children }) => (
            <blockquote data-blockquote>{children}</blockquote>
          ),
        },
        (root) => {
          const blockquotes = root.querySelectorAll("blockquote");
          expect(blockquotes).toHaveLength(4);

          expect(blockquotes[0]?.textContent).toBe("A blockquote.");
          expect(blockquotes[0]).toHaveAttribute("data-blockquote");
          expect(blockquotes[1]?.innerHTML).toEqual(
            "<p>Another one which spans</p><p>multiple paragraphs.</p>"
          );
          expect(blockquotes[1]).toHaveAttribute("data-blockquote");
          expect((blockquotes[2]?.firstChild as HTMLElement).tagName).toEqual(
            "P"
          );
          expect((blockquotes[2]?.firstChild as HTMLElement).innerHTML).toEqual(
            "Yet another which"
          );
          expect(blockquotes[2]).toHaveAttribute("data-blockquote");
          expect(blockquotes[3]?.innerHTML).toEqual("<p>is nested.</p>");
          expect(blockquotes[3]).toHaveAttribute("data-blockquote");
        }
      );
    });

    test("code blocks", () => {
      assert(
        `
          \`\`\`
          p {
            color: #000;
          }
          \`\`\`
  
          \`\`\`javascript
          const a = 2;
          \`\`\`
        `,
        {
          CodeBlock: ({ code, language }) => (
            <pre data-code-block>
              <code data-language={language}>{code}</code>
            </pre>
          ),
        },
        (root) => {
          const codeBlocks = root.querySelectorAll("pre");
          expect(codeBlocks).toHaveLength(2);

          expect(codeBlocks[0]?.textContent).toBe("p {\n  color: #000;\n}");
          expect(codeBlocks[0]).toHaveAttribute("data-code-block");
          expect(codeBlocks[1]?.textContent).toBe("const a = 2;");
          expect(codeBlocks[1]).toHaveAttribute("data-code-block");
          expect(codeBlocks[1]?.querySelector("code")).toHaveAttribute(
            "data-language",
            "javascript"
          );
        }
      );
    });

    test("images", () => {
      assert(
        `
          ![An image](https://www.liveblocks.io/favicon.svg)
        `,
        {
          Image: ({ src, alt }) => <img src={src} alt={alt} data-image />,
        },
        (root) => {
          const image = root.querySelector("img");

          expect(image).toHaveAttribute(
            "src",
            "https://www.liveblocks.io/favicon.svg"
          );
          expect(image).toHaveAttribute("alt", "An image");
        }
      );
    });

    test("tables", () => {
      assert(
        `
          | Feature       | Example                              | Notes                     |
          | ------------- | ------------------------------------ | ------------------------- |
          | Link          | [Liveblocks](https://liveblocks.io/) | External link             |
          | Inline code   | \`const a = 2;\`                     | Code inside table         |
          | Bold text     | **Important**                        | Styling test              |
          | Italic text   | _Emphasis_                           | Test italic inside tables |
          | Strikethrough | ~~Deprecated~~                       | Show removal              |
        `,
        {
          Table: ({ headings, rows }) => (
            <table data-table>
              <thead>
                <tr>
                  {headings.map((heading, index) => (
                    <th key={index}>{heading.children}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, index) => (
                      <td key={index}>{cell.children}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        },
        (root) => {
          const table = root.querySelector("table");

          expect(table).toHaveAttribute("data-table");

          const headings = table?.querySelectorAll("th");
          expect(headings).toHaveLength(3);

          expect(headings?.[0]?.textContent).toBe("Feature");
          expect(headings?.[1]?.textContent).toBe("Example");
          expect(headings?.[2]?.textContent).toBe("Notes");

          const rows = table?.querySelectorAll("tbody tr");
          expect(rows).toHaveLength(5);

          const firstRowCells = rows?.[0]?.querySelectorAll("td");
          expect(firstRowCells).toHaveLength(3);

          expect(firstRowCells?.[0]?.textContent).toBe("Link");
          expect(firstRowCells?.[1]?.textContent).toBe("Liveblocks");
          expect(firstRowCells?.[1]?.querySelector("a")).toHaveAttribute(
            "href",
            "https://liveblocks.io/"
          );
          expect(firstRowCells?.[2]?.textContent).toBe("External link");

          const secondRowCells = rows?.[1]?.querySelectorAll("td");
          expect(secondRowCells).toHaveLength(3);

          expect(secondRowCells?.[0]?.textContent).toBe("Inline code");
          expect(secondRowCells?.[1]?.textContent).toBe("const a = 2;");
          expect(secondRowCells?.[1]?.querySelector("code")?.textContent).toBe(
            "const a = 2;"
          );
          expect(secondRowCells?.[2]?.textContent).toBe("Code inside table");

          const thirdRowCells = rows?.[2]?.querySelectorAll("td");
          expect(thirdRowCells).toHaveLength(3);

          expect(thirdRowCells?.[0]?.textContent).toBe("Bold text");
          expect(thirdRowCells?.[1]?.textContent).toBe("Important");
          expect(thirdRowCells?.[1]?.querySelector("strong")?.textContent).toBe(
            "Important"
          );
          expect(thirdRowCells?.[2]?.textContent).toBe("Styling test");

          const fourthRowCells = rows?.[3]?.querySelectorAll("td");
          expect(fourthRowCells).toHaveLength(3);

          expect(fourthRowCells?.[0]?.textContent).toBe("Italic text");
          expect(fourthRowCells?.[1]?.textContent).toBe("Emphasis");
          expect(fourthRowCells?.[1]?.querySelector("em")?.textContent).toBe(
            "Emphasis"
          );
          expect(fourthRowCells?.[2]?.textContent).toBe(
            "Test italic inside tables"
          );

          const fifthRowCells = rows?.[4]?.querySelectorAll("td");
          expect(fifthRowCells).toHaveLength(3);

          expect(fifthRowCells?.[0]?.textContent).toBe("Strikethrough");
          expect(fifthRowCells?.[1]?.textContent).toBe("Deprecated");
          expect(fifthRowCells?.[1]?.querySelector("del")?.textContent).toBe(
            "Deprecated"
          );
          expect(fifthRowCells?.[2]?.textContent).toBe("Show removal");
        }
      );
    });

    test("separators", () => {
      assert(
        `
          ***
  
          ----
  
          _____
        `,
        {
          Separator: () => <hr data-separator />,
        },
        (root) => {
          const separators = root.querySelectorAll("hr");
          expect(separators).toHaveLength(3);

          separators.forEach((separator) => {
            expect(separator).toHaveAttribute("data-separator");
          });
        }
      );
    });
  });
});
