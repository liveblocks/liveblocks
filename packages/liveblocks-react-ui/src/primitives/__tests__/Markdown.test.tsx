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
      <Markdown data-testid="markdown" content="This is a" />
    );

    const element = getByTestId("markdown");

    expect(element).toHaveTextContent("This is a");
    expect(element.querySelector("a")).not.toBeInTheDocument();

    rerender(
      <Markdown
        data-testid="markdown"
        content="This is a [link](https://liveblocks.io)."
      />
    );

    expect(element).toHaveTextContent("This is a link.");
    expect(element.querySelector("a")).toHaveAttribute(
      "href",
      "https://liveblocks.io"
    );
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
          expect(paragraphs[0]).toHaveTextContent("A paragraph.");
          expect(paragraphs[1]).toHaveTextContent(
            "Another paragraph which spans multiple lines."
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
          expect(headings[0]).toHaveTextContent("Heading 1");
          expect(headings[1]).toHaveTextContent("Heading 2");
          expect(headings[2]).toHaveTextContent("Heading 3");
          expect(headings[3]).toHaveTextContent("Heading 4");
          expect(headings[4]).toHaveTextContent("Heading 5");
          expect(headings[5]).toHaveTextContent("Heading 6");
          expect(headings[6]).toHaveTextContent("Alternate heading 1");
          expect(headings[7]).toHaveTextContent("Alternate heading 2");
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
          expect(strongs[0]).toHaveTextContent("Bold");
          expect(strongs[1]).toHaveTextContent("bold");
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
          expect(ems[0]).toHaveTextContent("Italic");
          expect(ems[1]).toHaveTextContent("italic");
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
          expect(dels[0]).toHaveTextContent("Strikethrough");
          expect(dels[1]).toHaveTextContent("strikethrough");
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
          expect(codes[0]).toHaveTextContent("code");
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
          expect(links[0]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[1]).toHaveAttribute("href", "/docs");
          expect(links[2]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[3]).toHaveAttribute("href", "https://www.liveblocks.io");
        }
      );
    });

    test("nested inline elements", () => {
      assert(
        dedent`
        This is **bold _italic \`code\`_**, a **bold [link](https://www.liveblocks.io)**, and [one with **bold \`code\`**](#docs "With a title").
      `,
        (element) => {
          const firstInlineElement = element.querySelector(
            "strong:nth-child(1)"
          );

          expect(firstInlineElement).toHaveTextContent("bold italic code");
          expect(firstInlineElement?.querySelector("em")).toHaveTextContent(
            "italic code"
          );
          expect(firstInlineElement?.querySelector("code")).toHaveTextContent(
            "code"
          );

          const secondInlineElement = element.querySelector(
            "strong:nth-child(2)"
          );

          expect(secondInlineElement).toHaveTextContent("bold link");
          expect(secondInlineElement?.querySelector("a")).toHaveTextContent(
            "link"
          );
          expect(secondInlineElement?.querySelector("a")).toHaveAttribute(
            "href",
            "https://www.liveblocks.io"
          );

          const thirdInlineElement = element.querySelector(
            "a[title='With a title']"
          );
          expect(thirdInlineElement).toHaveTextContent("one with bold code");
          expect(thirdInlineElement).toHaveAttribute("href", "#docs");
          expect(thirdInlineElement?.querySelector("strong")).toHaveTextContent(
            "bold code"
          );
          expect(thirdInlineElement?.querySelector("code")).toHaveTextContent(
            "code"
          );
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
          expect(listItems?.[0]).toHaveTextContent("A list item");
          expect(listItems?.[1]).toHaveTextContent("Another list item");
          expect(listItems?.[2]).toHaveTextContent("Yet another list item");
        }
      );
    });

    test("ordered lists with arbitrary start indices", () => {
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
            expect(listItems?.[0]).toHaveTextContent("A list item");
            expect(listItems?.[1]).toHaveTextContent("Another list item");
            expect(listItems?.[2]).toHaveTextContent("Yet another list item");
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
          expect(listItems?.[0]).toHaveTextContent("A list item");
          expect(
            listItems?.[0]?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
          expect(listItems?.[1]).toHaveTextContent("Another list item");
          expect(
            listItems?.[1]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
          expect(listItems?.[2]).toHaveTextContent("Yet another list item");
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
          expect(firstNestedFirstList?.childNodes[0]).toHaveTextContent(
            "A nested list item"
          );

          //   - Another nested list item
          //     - [ ] A deeply nested list item
          const firstNestedSecondList = firstNestedLists?.[1];
          expect(firstNestedSecondList?.tagName).toBe("UL");
          expect(firstNestedSecondList?.childNodes).toHaveLength(1);
          expect(
            firstNestedSecondList?.childNodes[0]?.childNodes[0]
          ).toHaveTextContent("Another nested list item");

          //     - [ ] A deeply nested list item
          const firstNestedSecondListFirstNestedList = firstNestedSecondList
            ?.childNodes[0]?.childNodes[1] as HTMLElement | null;
          expect(firstNestedSecondListFirstNestedList).toHaveTextContent(
            "A deeply nested list item"
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
          expect(secondNestedList?.childNodes[0]).toHaveTextContent(
            "A nested list item"
          );
          expect(secondNestedList?.childNodes[1]).toHaveTextContent(
            "Another nested list item"
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

          expect(listItems?.[0]).toHaveTextContent("A list item");

          expect(listItems?.[1]?.innerHTML).toEqual(
            "<p>Another list item with</p><p>multiple paragraphs.</p>"
          );

          expect(listItems?.[2]).toHaveTextContent("A task list item with");
          expect(
            listItems?.[2]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
          expect(listItems?.[2]?.querySelector("blockquote")).toHaveTextContent(
            "a quote and a code block"
          );
          expect(listItems?.[2]?.querySelector("pre")).toHaveTextContent(
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
          expect(blockquotes[0]).toHaveTextContent("A blockquote.");

          const blockquote1Paragraphs = blockquotes[1]?.querySelectorAll("p");
          expect(blockquote1Paragraphs).toHaveLength(2);
          expect(blockquote1Paragraphs?.[0]).toHaveTextContent(
            "Another one which spans"
          );
          expect(blockquote1Paragraphs?.[1]).toHaveTextContent(
            "multiple paragraphs."
          );

          expect(blockquotes[2]?.childNodes[0]).toHaveTextContent(
            "Yet another which"
          );

          const blockquote2NestedBlockquote = blockquotes[2]
            ?.childNodes[1] as HTMLElement | null;
          expect(blockquote2NestedBlockquote?.tagName).toBe("BLOCKQUOTE");
          expect(blockquote2NestedBlockquote?.childNodes[0]).toHaveTextContent(
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
          expect(tableHeadings?.[0]).toHaveTextContent("A column heading");
          expect(tableHeadings?.[1]).toHaveTextContent(
            "Another column heading"
          );

          const tableRows = table?.querySelectorAll("tbody tr");
          expect(tableRows).toHaveLength(2);

          tableRows?.forEach((row) => {
            const cells = row.querySelectorAll("td");

            expect(cells).toHaveLength(2);
            expect(cells?.[0]).toHaveTextContent("A cell");
            expect(cells?.[1]).toHaveTextContent("Another cell");
          });
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
          const horizontalRules = root.querySelectorAll("hr");

          expect(horizontalRules).toHaveLength(3);
        }
      );
    });

    test("escaped characters", () => {
      assert(
        `
          \\*Not italic\\* and \\[not a link\\]\\(https://liveblocks.io).
        `,
        (root) => {
          expect(root).toHaveTextContent(
            "*Not italic* and [not a link](https://liveblocks.io)."
          );
        }
      );
    });

    test("HTML entities", () => {
      assert(
        `
          &lt;p&gt; &amp;
  
          > &quot; &apos;
  
          - &copy; &trade;
        `,
        (root) => {
          expect(root.querySelector("p")).toHaveTextContent("<p> &");
          expect(root.querySelector("blockquote")).toHaveTextContent("\" '");
          expect(root.querySelector("li")).toHaveTextContent("© ™");
        }
      );
    });

    test("HTML elements as plain text", () => {
      assert(
        `
          The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.
  
          Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.
  
          This is <mark>highlighted</mark> text.
  
          E = mc<sup>2</sup>
        `,
        (root) => {
          const paragraphs = root.querySelectorAll("p");
          expect(paragraphs).toHaveLength(4);

          expect(paragraphs[0]).toHaveTextContent(
            "The abbreviation for HyperText Markup Language is HTML."
          );
          expect(paragraphs[1]).toHaveTextContent("Press Ctrl + C to copy.");
          expect(paragraphs[2]).toHaveTextContent("This is highlighted text.");
          expect(paragraphs[3]).toHaveTextContent("E = mc2");
        }
      );
    });
  });

  describe("should handle partial…", () => {
    function assert(content: string, assertions: (root: HTMLElement) => void) {
      const { getByTestId, unmount } = render(
        <Markdown data-testid="markdown" content={content} partial />
      );

      assertions(getByTestId("markdown"));
      unmount();
    }

    test("headings", () => {
      assert(
        dedent`
        ###
      `,
        (element) => {
          const heading = element.querySelector("h3");

          expect(heading).toHaveTextContent("");
        }
      );

      assert(
        dedent`
        No heading
        =
      `,
        (element) => {
          const heading = element.querySelector("h1");

          expect(heading).not.toBeInTheDocument();
          expect(element).toHaveTextContent("No heading");
        }
      );

      assert(
        dedent`
        No heading
        ==
      `,
        (element) => {
          const heading = element.querySelector("h1");

          expect(heading).not.toBeInTheDocument();
          expect(element).toHaveTextContent("No heading");
        }
      );

      assert(
        dedent`
        Heading 1
        ===
      `,
        (element) => {
          const heading = element.querySelector("h1");

          expect(heading).toHaveTextContent("Heading 1");
        }
      );

      assert(
        dedent`
        No heading
        -
      `,
        (element) => {
          const heading = element.querySelector("h2");

          expect(heading).not.toBeInTheDocument();
          expect(element).toHaveTextContent("No heading");
        }
      );

      assert(
        dedent`
        No heading
        --
      `,
        (element) => {
          const heading = element.querySelector("h2");

          expect(heading).not.toBeInTheDocument();
          expect(element).toHaveTextContent("No heading");
        }
      );

      assert(
        dedent`
        Heading 2
        ---
      `,
        (element) => {
          const heading = element.querySelector("h2");

          expect(heading).toHaveTextContent("Heading");
        }
      );
    });

    test("bold text", () => {
      assert(
        dedent`
        This isn't **
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This isn't __
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This is **bold text
      `,
        (element) => {
          const strong = element.querySelector("strong");

          expect(strong).toHaveTextContent("bold text");
        }
      );

      assert(
        dedent`
        This is __bold text
      `,
        (element) => {
          const strong = element.querySelector("strong");

          expect(strong).toHaveTextContent("bold text");
        }
      );
    });

    test("italic text", () => {
      assert(
        dedent`
        This isn't *
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This isn't _
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This is *italic text
      `,
        (element) => {
          const em = element.querySelector("em");

          expect(em).toHaveTextContent("italic text");
        }
      );

      assert(
        dedent`
        This is _italic text
      `,
        (element) => {
          const em = element.querySelector("em");

          expect(em).toHaveTextContent("italic text");
        }
      );
    });

    test("strikethrough text", () => {
      assert(
        dedent`
        This isn't ~
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This isn't ~~
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This is ~strikethrough text
      `,
        (element) => {
          const del = element.querySelector("del");

          expect(del).toHaveTextContent("strikethrough text");
        }
      );

      assert(
        dedent`
        This is ~~strikethrough text
      `,
        (element) => {
          const del = element.querySelector("del");

          expect(del).toHaveTextContent("strikethrough text");
        }
      );
    });

    test("inline code", () => {
      assert(
        dedent`
        This isn't \`
      `,
        (element) => {
          expect(element).toHaveTextContent("This isn't");
        }
      );

      assert(
        dedent`
        This is \`inline code
      `,
        (element) => {
          const code = element.querySelector("code");

          expect(code).toHaveTextContent("inline code");
        }
      );
    });

    test("links", () => {
      assert(
        dedent`
        This is a [
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).toHaveTextContent("");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        dedent`
        This is a [li
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).toHaveTextContent("li");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        dedent`
        This is a [link]
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).toHaveTextContent("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        dedent`
        This isn't a [link] with text
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).not.toBeInTheDocument();
          expect(element).toHaveTextContent("This isn't a [link] with text");
        }
      );

      assert(
        dedent`
        This is a [link](http
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).toHaveTextContent("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      assert(
        dedent`
        This is a [link](https://www.liveblocks.io
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).toHaveTextContent("link");
          expect(link).toHaveAttribute("href", "https://www.liveblocks.io");
        }
      );

      // Links can have titles.
      assert(
        dedent`
        This is a [link](https://www.liveblocks.io "Liveblocks
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).toHaveTextContent("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      // Footnotes aren't links.
      assert(
        dedent`
        This isn't a [^
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).not.toBeInTheDocument();
        }
      );

      assert(
        dedent`
        This isn't a [^1
      `,
        (element) => {
          const link = element.querySelector("a");

          expect(link).not.toBeInTheDocument();
        }
      );
    });

    test("nested inline elements", () => {
      assert(
        dedent`
        This is **bold _italic \`code
      `,
        (element) => {
          const strong = element.querySelector("strong");
          const em = strong?.querySelector("em");
          const code = em?.querySelector("code");

          expect(strong).toHaveTextContent("bold italic code");
          expect(em).toHaveTextContent("italic code");
          expect(code).toHaveTextContent("code");
        }
      );

      assert(
        dedent`
        This is **bold _italic_ \`code
      `,
        (element) => {
          const strong = element.querySelector("strong");
          const em = strong?.querySelector("em");
          const code = strong?.querySelector("code");

          expect(strong).toHaveTextContent("bold italic code");
          expect(em).toHaveTextContent("italic");
          expect(code).toHaveTextContent("code");
        }
      );

      assert(
        dedent`
        This is a **bold [link
      `,
        (element) => {
          const strong = element.querySelector("strong");
          const link = strong?.querySelector("a");

          expect(strong).toHaveTextContent("bold link");
          expect(link).toHaveTextContent("link");
          expect(link).toHaveAttribute("href", "#");
        }
      );

      // Links can't be inside inline code.
      assert(
        dedent`
        This isn't a \`code [link
      `,
        (element) => {
          const code = element.querySelector("code");
          const link = code?.querySelector("a");

          expect(code).toHaveTextContent("code [link");
          expect(link).not.toBeInTheDocument();
        }
      );

      assert(
        dedent`
        This is a [link with \`code
      `,
        (element) => {
          const link = element.querySelector("a");
          const code = link?.querySelector("code");

          expect(link).toHaveTextContent("link with code");
          expect(link).toHaveAttribute("href", "#");
          expect(code).toHaveTextContent("code");
        }
      );

      assert(
        dedent`
        This is a [link with **bold \`code\`
      `,
        (element) => {
          const link = element.querySelector("a");
          const strong = link?.querySelector("strong");
          const code = strong?.querySelector("code");

          expect(link).toHaveTextContent("link with bold code");
          expect(link).toHaveAttribute("href", "#");
          expect(strong).toHaveTextContent("bold code");
          expect(code).toHaveTextContent("code");
        }
      );
    });

    test("lists", () => {
      assert(
        dedent`
        -
      `,
        (element) => {
          expect(element).toHaveTextContent("");
        }
      );

      assert(
        dedent`
        - A list item
      `,
        (element) => {
          const li = element.querySelector("li");

          expect(li).toHaveTextContent("A list item");
        }
      );

      assert(
        dedent`
        1
      `,
        (element) => {
          expect(element).toHaveTextContent("");
        }
      );

      assert(
        dedent`
        1. A list item
      `,
        (element) => {
          const li = element.querySelector("li");

          expect(li).toHaveTextContent("A list item");
        }
      );

      assert(
        dedent`
        - [
      `,
        (element) => {
          const li = element.querySelector("li");

          expect(li?.querySelector("input[type='checkbox']")).not.toBeChecked();
        }
      );

      assert(
        dedent`
        - [ ]
      `,
        (element) => {
          const li = element.querySelector("li");

          expect(li?.querySelector("input[type='checkbox']")).not.toBeChecked();
        }
      );

      assert(
        dedent`
        - [x
      `,
        (element) => {
          const li = element.querySelector("li");

          expect(li?.querySelector("input[type='checkbox']")).toBeChecked();
        }
      );

      assert(
        dedent`
        - [x]
      `,
        (element) => {
          const li = element.querySelector("li");

          expect(li?.querySelector("input[type='checkbox']")).toBeChecked();
        }
      );
    });

    test("images", () => {
      assert(
        dedent`
        Not an image: !
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).not.toBeInTheDocument();
          expect(element).toHaveTextContent("Not an image");
        }
      );

      assert(
        dedent`
        Not an image: ![
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).not.toBeInTheDocument();
          expect(element).toHaveTextContent("Not an image:");
        }
      );

      assert(
        dedent`
        Not an image: ![image
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).not.toBeInTheDocument();
          expect(element).toHaveTextContent("Not an image:");
        }
      );

      assert(
        dedent`
        Not an image: ![image](https://www.liveblocks.io/favicon.svg
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).not.toBeInTheDocument();
          expect(element).toHaveTextContent("Not an image:");
        }
      );

      assert(
        dedent`
        Not an image: ![](https://www.liveblocks.io/favicon.svg
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).not.toBeInTheDocument();
          expect(element).toHaveTextContent("Not an image:");
        }
      );

      assert(
        dedent`
        An image: ![image](https://www.liveblocks.io/favicon.svg)
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).toHaveAttribute(
            "src",
            "https://www.liveblocks.io/favicon.svg"
          );
          expect(image).toHaveAttribute("alt", "image");
          expect(element).toHaveTextContent("An image:");
        }
      );

      assert(
        dedent`
        An image: ![](https://www.liveblocks.io/favicon.svg)
      `,
        (element) => {
          const image = element.querySelector("img");

          expect(image).toHaveAttribute(
            "src",
            "https://www.liveblocks.io/favicon.svg"
          );
          expect(image).toHaveAttribute("alt", "");
          expect(element).toHaveTextContent("An image:");
        }
      );
    });

    test("code blocks", () => {
      assert(
        dedent`
        \`\`
      `,
        (element) => {
          expect(element).toHaveTextContent("");
        }
      );

      assert(
        dedent`
        \`\`\`
      `,
        (element) => {
          expect(element).toHaveTextContent("");
        }
      );

      assert(
        dedent`
        \`\`\`css
      `,
        (element) => {
          const codeBlock = element.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock).toHaveTextContent("");
          expect(codeBlock).toHaveAttribute("data-language", "css");
        }
      );

      assert(
        dedent`
        \`\`\`css
        p {
          color: #000;
      `,
        (element) => {
          const codeBlock = element.querySelector("pre");

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
        dedent`
        \`\`\`
        const [count, setCount
      `,
        (element) => {
          const codeBlock = element.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock?.querySelector("code")?.innerHTML).toBe(
            "const [count, setCount"
          );
          expect(codeBlock).toHaveAttribute("data-language", "");
        }
      );

      assert(
        dedent`
        \`\`\`css
        p {
          color: #000;
        }
        \`\`
      `,
        (element) => {
          const codeBlock = element.querySelector("pre");

          expect(codeBlock).toBeInTheDocument();
          expect(codeBlock?.querySelector("code")?.innerHTML).toBe(
            "p {\n  color: #000;\n}"
          );
          expect(codeBlock).toHaveAttribute("data-language", "css");
        }
      );

      assert(
        dedent`
        \`\`\`css
        p {
          color: #000;
        }
        \`\`\`
      `,
        (element) => {
          const codeBlock = element.querySelector("pre");

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
        dedent`
        | A column heading
      `,
        (element) => {
          const table = element.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(1);
          expect(tableHeadings?.[0]).toHaveTextContent("A column heading");
        }
      );

      assert(
        dedent`
        | A column heading | Another column
      `,
        (element) => {
          const table = element.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]).toHaveTextContent("A column heading");
          expect(tableHeadings?.[1]).toHaveTextContent("Another column");
        }
      );

      assert(
        dedent`
        | A column heading | Another column heading |
        |------------------|
      `,
        (element) => {
          const table = element.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]).toHaveTextContent("A column heading");
          expect(tableHeadings?.[1]).toHaveTextContent("Another column");
        }
      );

      assert(
        dedent`
        A paragraph

          | A column heading | Another column heading |
          |------------------|
      `,
        (element) => {
          const table = element.querySelector("table");
          expect(table).toBeInTheDocument();

          const tableHeadings = table?.querySelectorAll("th");
          expect(tableHeadings).toHaveLength(2);
          expect(tableHeadings?.[0]).toHaveTextContent("A column heading");
          expect(tableHeadings?.[1]).toHaveTextContent("Another column");
        }
      );
    });

    test("horizontal rules", () => {
      assert(
        dedent`
        A paragraph

        -
      `,
        (element) => {
          expect(element).toHaveTextContent("A paragraph");
        }
      );

      assert(
        dedent`
        A paragraph

        _
      `,
        (element) => {
          expect(element).toHaveTextContent("A paragraph");
        }
      );

      assert(
        dedent`
        A paragraph

        --
      `,
        (element) => {
          expect(element).toHaveTextContent("A paragraph");
        }
      );

      assert(
        dedent`
        A paragraph

        __
      `,
        (element) => {
          expect(element).toHaveTextContent("A paragraph");
        }
      );

      assert(
        dedent`
        A paragraph

        ---

        Another paragraph
      `,
        (element) => {
          const hr = element.querySelector("hr");

          expect(hr).toBeInTheDocument();
        }
      );

      assert(
        dedent`
        A paragraph

        ___

        Another paragraph
      `,
        (element) => {
          const hr = element.querySelector("hr");

          expect(hr).toBeInTheDocument();
        }
      );
    });

    test("escaped characters", () => {
      assert(
        dedent`
        A paragraph \\
      `,
        (element) => {
          expect(element).toHaveTextContent("A paragraph");
        }
      );

      assert(
        dedent`
        A paragraph \\~
      `,
        (element) => {
          expect(element).toHaveTextContent("A paragraph ~");
        }
      );
    });

    test("emojis", () => {
      assert(
        dedent`
        An emoji 👋
      `,
        (element) => {
          expect(element).toHaveTextContent("An emoji");
        }
      );

      assert(
        dedent`
        A skin tone sequence emoji 👋🏽
      `,
        (element) => {
          expect(element).toHaveTextContent("A skin tone sequence emoji");
        }
      );

      assert(
        dedent`
        A partial sequence emoji 👋\u200D
      `,
        (element) => {
          expect(element).toHaveTextContent("A partial sequence emoji");
        }
      );

      assert(
        dedent`
        An umbrella as a pictographic ☂
      `,
        (element) => {
          expect(element).toHaveTextContent("An umbrella as a pictographic ☂");
        }
      );

      assert(
        dedent`
        An umbrella as an emoji ☂️
      `,
        (element) => {
          expect(element).toHaveTextContent("An umbrella as an emoji");
        }
      );

      assert(
        dedent`
        A partial flag emoji 🇺
      `,
        (element) => {
          expect(element).toHaveTextContent("A partial flag emoji");
        }
      );

      assert(
        dedent`
        A flag emoji 🇺🇳
      `,
        (element) => {
          expect(element).toHaveTextContent("A flag emoji");
        }
      );

      assert(
        dedent`
        A keycap sequence emoji 1️⃣
      `,
        (element) => {
          expect(element).toHaveTextContent("A keycap sequence");
        }
      );

      assert(
        dedent`
        An emoji 👋 and some text
      `,
        (element) => {
          expect(element).toHaveTextContent("An emoji 👋 and some text");
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
          A paragraph.
        `,
        {
          Paragraph: ({ children }) => <p data-paragraph>{children}</p>,
        },
        (root) => {
          const paragraph = root.querySelector("p");

          expect(paragraph).toBeInTheDocument();
          expect(paragraph).toHaveTextContent("A paragraph.");
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
            expect(heading).toHaveTextContent(`Heading ${index + 1}`);
          });
        }
      );
    });

    test("inline elements", () => {
      assert(
        `
          This is **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, and **\`bold inline code\`**.
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
          expect(strongs[0]).toHaveTextContent("bold text");
          expect(strongs[0]).toHaveAttribute("data-inline", "strong");
          expect(strongs[1]).toHaveTextContent("bold and italic");
          expect(strongs[1]).toHaveAttribute("data-inline", "strong");
          expect(strongs[2]).toHaveTextContent("bold inline code");
          expect(strongs[2]).toHaveAttribute("data-inline", "strong");

          const italics = root.querySelectorAll("em");
          expect(italics).toHaveLength(2);
          expect(italics[0]).toHaveTextContent("italic text");
          expect(italics[0]).toHaveAttribute("data-inline", "em");
          expect(italics[1]).toHaveTextContent("bold and italic");
          expect(italics[1]).toHaveAttribute("data-inline", "em");

          const strikethroughs = root.querySelectorAll("del");
          expect(strikethroughs).toHaveLength(1);
          expect(strikethroughs[0]).toHaveTextContent("strikethrough");
          expect(strikethroughs[0]).toHaveAttribute("data-inline", "del");

          const codes = root.querySelectorAll("code");
          expect(codes).toHaveLength(2);
          expect(codes[0]).toHaveTextContent("inline code");
          expect(codes[0]).toHaveAttribute("data-inline", "code");
          expect(codes[1]).toHaveTextContent("bold inline code");
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
          expect(links[0]).toHaveTextContent("link");

          expect(links[1]).toHaveAttribute("data-link");
          expect(links[1]).toHaveAttribute("href", "/docs");
          expect(links[1]).toHaveTextContent("another one");
          expect(links[1]).toHaveAttribute("title", "With a title");

          expect(links[2]).toHaveAttribute("data-link");
          expect(links[2]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[2]).toHaveTextContent("https://www.liveblocks.io");

          expect(links[3]).toHaveAttribute("data-link");
          expect(links[3]).toHaveAttribute("href", "https://www.liveblocks.io");
          expect(links[3]).toHaveTextContent("https://www.liveblocks.io");
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

          expect(rootListItems[0]).toHaveTextContent("A list item");

          const firstNestedList = rootListItems[0]?.querySelector("ol");
          expect(firstNestedList).toHaveAttribute("data-list");

          const firstNestedListItems = firstNestedList?.querySelectorAll("li");
          expect(firstNestedListItems).toHaveLength(3);

          expect(firstNestedListItems?.[0]).toHaveTextContent("A list item");
          expect(firstNestedListItems?.[1]).toHaveTextContent(
            "Another list item"
          );
          expect(firstNestedListItems?.[2]).toHaveTextContent(
            "Yet another list item"
          );

          const secondRootListItem = rootListItems[1];
          expect(secondRootListItem).toHaveTextContent("Another list item");

          const secondNestedList = secondRootListItem?.querySelector("ul");
          expect(secondNestedList).toHaveAttribute("data-list");

          const secondNestedListItems =
            secondNestedList?.querySelectorAll("li");
          expect(secondNestedListItems).toHaveLength(3);

          expect(secondNestedListItems?.[0]).toHaveTextContent(
            "A task list item"
          );
          expect(
            secondNestedListItems?.[0]?.querySelector("input[type='checkbox']")
          ).not.toBeChecked();
          expect(secondNestedListItems?.[1]).toHaveTextContent(
            "A completed task list item"
          );
          expect(
            secondNestedListItems?.[1]?.querySelector("input[type='checkbox']")
          ).toBeChecked();
          expect(secondNestedListItems?.[2]).toHaveTextContent(
            "Another completed task list item"
          );
          expect(
            secondNestedListItems?.[2]?.querySelector("input[type='checkbox']")
          ).toBeChecked();

          const thirdRootListItem = rootListItems[2];
          expect(thirdRootListItem).toHaveTextContent("Yet another list item");

          const thirdNestedLists =
            thirdRootListItem?.querySelectorAll("ol, ul");
          expect(thirdNestedLists).toHaveLength(3);

          expect(thirdNestedLists?.[0]).toHaveAttribute("data-list", "ordered");
          expect(thirdNestedLists?.[0]?.querySelector("li")).toHaveTextContent(
            "A list item"
          );

          expect(thirdNestedLists?.[1]).toHaveAttribute(
            "data-list",
            "unordered"
          );
          expect(thirdNestedLists?.[1]?.querySelector("li")).toHaveTextContent(
            "Another list item"
          );

          expect(thirdNestedLists?.[2]).toHaveAttribute(
            "data-list",
            "unordered"
          );
          expect(thirdNestedLists?.[2]?.querySelector("li")).toHaveTextContent(
            "Yet another list item"
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

          expect(blockquotes[0]).toHaveTextContent("A blockquote.");
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

          expect(codeBlocks[0]).toHaveTextContent("p { color: #000; }");
          expect(codeBlocks[0]).toHaveAttribute("data-code-block");
          expect(codeBlocks[1]).toHaveTextContent("const a = 2;");
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

          expect(image).toBeInTheDocument();
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

          expect(table).toBeInTheDocument();
          expect(table).toHaveAttribute("data-table");

          const headings = table?.querySelectorAll("th");
          expect(headings).toHaveLength(3);

          expect(headings?.[0]).toHaveTextContent("Feature");
          expect(headings?.[1]).toHaveTextContent("Example");
          expect(headings?.[2]).toHaveTextContent("Notes");

          const rows = table?.querySelectorAll("tbody tr");
          expect(rows).toHaveLength(5);

          const firstRowCells = rows?.[0]?.querySelectorAll("td");
          expect(firstRowCells).toHaveLength(3);

          expect(firstRowCells?.[0]).toHaveTextContent("Link");
          expect(firstRowCells?.[1]).toHaveTextContent("Liveblocks");
          expect(firstRowCells?.[1]?.querySelector("a")).toHaveAttribute(
            "href",
            "https://liveblocks.io/"
          );
          expect(firstRowCells?.[2]).toHaveTextContent("External link");

          const secondRowCells = rows?.[1]?.querySelectorAll("td");
          expect(secondRowCells).toHaveLength(3);

          expect(secondRowCells?.[0]).toHaveTextContent("Inline code");
          expect(secondRowCells?.[1]).toHaveTextContent("const a = 2;");
          expect(secondRowCells?.[1]?.querySelector("code")).toHaveTextContent(
            "const a = 2;"
          );
          expect(secondRowCells?.[2]).toHaveTextContent("Code inside table");

          const thirdRowCells = rows?.[2]?.querySelectorAll("td");
          expect(thirdRowCells).toHaveLength(3);

          expect(thirdRowCells?.[0]).toHaveTextContent("Bold text");
          expect(thirdRowCells?.[1]).toHaveTextContent("Important");
          expect(thirdRowCells?.[1]?.querySelector("strong")).toHaveTextContent(
            "Important"
          );
          expect(thirdRowCells?.[2]).toHaveTextContent("Styling test");

          const fourthRowCells = rows?.[3]?.querySelectorAll("td");
          expect(fourthRowCells).toHaveLength(3);

          expect(fourthRowCells?.[0]).toHaveTextContent("Italic text");
          expect(fourthRowCells?.[1]).toHaveTextContent("Emphasis");
          expect(fourthRowCells?.[1]?.querySelector("em")).toHaveTextContent(
            "Emphasis"
          );
          expect(fourthRowCells?.[2]).toHaveTextContent(
            "Test italic inside tables"
          );

          const fifthRowCells = rows?.[4]?.querySelectorAll("td");
          expect(fifthRowCells).toHaveLength(3);

          expect(fifthRowCells?.[0]).toHaveTextContent("Strikethrough");
          expect(fifthRowCells?.[1]).toHaveTextContent("Deprecated");
          expect(fifthRowCells?.[1]?.querySelector("del")).toHaveTextContent(
            "Deprecated"
          );
          expect(fifthRowCells?.[2]).toHaveTextContent("Show removal");
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
