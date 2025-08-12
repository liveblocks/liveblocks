import "@testing-library/jest-dom";

import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Markdown, type MarkdownComponents } from "../Markdown";
import { dedent } from "./_utils";

describe("Markdown", () => {
  test.each([
    {
      description: "paragraphs",
      content: dedent`
        A paragraph.

        Another paragraph which
        spans multiple lines.
      `,
      assertions: (element) => {
        const paragraphs = element.querySelectorAll("p");

        expect(paragraphs).toHaveLength(2);
        expect(paragraphs[0]).toHaveTextContent("A paragraph.");
        expect(paragraphs[1]).toHaveTextContent(
          "Another paragraph which spans multiple lines."
        );
      },
    },
    {
      description: "headings",
      content: dedent`
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
      assertions: (element) => {
        const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");

        expect(headings).toHaveLength(8);
        expect(headings[0]).toHaveTextContent("Heading 1");
        expect(headings[1]).toHaveTextContent("Heading 2");
        expect(headings[2]).toHaveTextContent("Heading 3");
        expect(headings[3]).toHaveTextContent("Heading 4");
        expect(headings[4]).toHaveTextContent("Heading 5");
        expect(headings[5]).toHaveTextContent("Heading 6");
        expect(headings[6]).toHaveTextContent("Alternate heading 1");
        expect(headings[7]).toHaveTextContent("Alternate heading 2");
      },
    },
    {
      description: "bold text",
      content: dedent`
        **Bold** and __bold__.
      `,
      assertions: (element) => {
        const strongs = element.querySelectorAll("strong");

        expect(strongs).toHaveLength(2);
        expect(strongs[0]).toHaveTextContent("Bold");
        expect(strongs[1]).toHaveTextContent("bold");
      },
    },
    {
      description: "italic text",
      content: dedent`
        *Italic* and _italic_.
      `,
      assertions: (element) => {
        const ems = element.querySelectorAll("em");

        expect(ems).toHaveLength(2);
        expect(ems[0]).toHaveTextContent("Italic");
        expect(ems[1]).toHaveTextContent("italic");
      },
    },
    {
      description: "strikethrough text",
      content: dedent`
        ~~Strikethrough~~.
      `,
      assertions: (element) => {
        const dels = element.querySelectorAll("del");

        expect(dels).toHaveLength(1);
        expect(dels[0]).toHaveTextContent("Strikethrough");
      },
    },
    {
      description: "inline code",
      content: dedent`
        Inline \`code\`.
      `,
      assertions: (element) => {
        const codes = element.querySelectorAll("code");

        expect(codes).toHaveLength(1);
        expect(codes[0]).toHaveTextContent("code");
      },
    },
    {
      description: "links",
      content: dedent`
        A [link](https://www.liveblocks.io), [another one](/docs "With a title"),
        https://www.liveblocks.io, and <https://www.liveblocks.io>.
      `,
      assertions: (element) => {
        const links = element.querySelectorAll("a");

        expect(links).toHaveLength(4);
        expect(links[0]).toHaveAttribute("href", "https://www.liveblocks.io");
        expect(links[1]).toHaveAttribute("href", "/docs");
        expect(links[2]).toHaveAttribute("href", "https://www.liveblocks.io");
        expect(links[3]).toHaveAttribute("href", "https://www.liveblocks.io");
      },
    },
    {
      description: "ordered lists",
      content: dedent`
        1. A list item
        2. Another list item
        3. Yet another list item
      `,
      assertions: (element) => {
        const list = element.querySelector("ol");
        const listItems = list?.querySelectorAll("li");

        expect(list).not.toBeNull();
        expect(listItems).toHaveLength(3);
        expect(listItems?.[0]).toHaveTextContent("A list item");
        expect(listItems?.[1]).toHaveTextContent("Another list item");
        expect(listItems?.[2]).toHaveTextContent("Yet another list item");
      },
    },
    {
      description: "unordered lists",
      content: dedent`
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
      assertions: (element) => {
        const lists = element.querySelectorAll("ul");

        lists.forEach((list) => {
          const listItems = list.querySelectorAll("li");

          expect(listItems).toHaveLength(3);
          expect(listItems?.[0]).toHaveTextContent("A list item");
          expect(listItems?.[1]).toHaveTextContent("Another list item");
          expect(listItems?.[2]).toHaveTextContent("Yet another list item");
        });
      },
    },
    {
      description: "task lists",
      content: dedent`
        - [ ] A list item
        - [x] Another list item
        - [ ] Yet another list item
      `,
      assertions: (element) => {
        const list = element.querySelector("ul");
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
      },
    },
    {
      description: "mixed lists",
      content: dedent`
        - A list item
          1. A nested list item
          - Another nested list item
            - [ ] A deeply nested list item
        - Another list item
          1. A nested list item
          2. [x] Another nested list item
      `,
      assertions: (element) => {
        const rootList = element.querySelector(":scope > ul");
        expect(rootList).toBeInTheDocument();

        const rootListItems = element.querySelectorAll(":scope > ul > li");
        expect(rootListItems).toHaveLength(2);

        // - A list item
        //   1. A nested list item
        //   - Another nested list item
        //     - [ ] A deeply nested list item
        const firstNestedLists = element?.querySelectorAll(
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
        const secondNestedList = element?.querySelector(
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
      },
    },
    {
      description: "loose lists",
      content: dedent`
        - A list item

        - Another list item with

          multiple paragraphs.

        - [x] A task list item with

          > a quote and a code block

          \`\`\`
          const a = 2;
          \`\`\`
      `,
      assertions: (element) => {
        const list = element.querySelector("ul");
        expect(list).toBeInTheDocument();

        const listItems = list?.querySelectorAll("li");
        expect(listItems).toHaveLength(3);

        expect(listItems?.[0]).toHaveTextContent("A list item");

        expect(listItems?.[1]).toHaveTextContent(
          "Another list item withmultiple paragraphs."
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
      },
    },
    {
      description: "numbered lists with arbitrary start indices",
      content: dedent`
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
      assertions: (element) => {
        const listItems = element.querySelectorAll("li");
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
      },
    },
    {
      description: "blockquotes",
      content: dedent`
        > A blockquote.

        > Another one which spans
        >
        > multiple paragraphs.

        > Yet another which
        >
        > > is nested.
      `,
      assertions: (element) => {
        const blockquotes = element.querySelectorAll(":scope >blockquote");

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
      },
    },
    {
      description: "code blocks",
      content: dedent`
        \`\`\`
        p {
          color: #000;
        }
        \`\`\`

        \`\`\`javascript
        const a = 2;
        \`\`\`
      `,
      assertions: (element) => {
        const codeBlocks = element.querySelectorAll("pre");
        expect(codeBlocks).toHaveLength(2);

        expect(codeBlocks[0]?.textContent).toBe("p {\n  color: #000;\n}");
        expect(codeBlocks[1]?.textContent).toBe("const a = 2;");
      },
    },
    {
      description: "images",
      content: dedent`
        ![An image](https://www.liveblocks.io/favicon.png)
      `,
      assertions: (element) => {
        const images = element.querySelectorAll("img");

        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute(
          "src",
          "https://www.liveblocks.io/favicon.png"
        );
      },
    },
    {
      description: "tables",
      content: dedent`
        | A column heading | Another column heading |
        |------------------|------------------------|
        | A cell           | Another cell           |
        | A cell           | Another cell           |
      `,
      assertions: (element) => {
        const table = element.querySelector("table");
        expect(table).toBeInTheDocument();

        const tableHeadings = table?.querySelectorAll("th");
        expect(tableHeadings).toHaveLength(2);
        expect(tableHeadings?.[0]).toHaveTextContent("A column heading");
        expect(tableHeadings?.[1]).toHaveTextContent("Another column heading");

        const tableRows = table?.querySelectorAll("tbody tr");
        expect(tableRows).toHaveLength(2);

        tableRows?.forEach((row) => {
          const cells = row.querySelectorAll("td");

          expect(cells).toHaveLength(2);
          expect(cells?.[0]).toHaveTextContent("A cell");
          expect(cells?.[1]).toHaveTextContent("Another cell");
        });
      },
    },
    {
      description: "horizontal rules",
      content: dedent`
        ***

        ---

        _____
      `,
      assertions: (element) => {
        const horizontalRules = element.querySelectorAll("hr");

        expect(horizontalRules).toHaveLength(3);
      },
    },
    {
      description: "escaped characters",
      content: dedent`
        \\*Not italic\\* and \\[not a link\\]\\(https://liveblocks.io\).
      `,
      assertions: (element) => {
        expect(element).toHaveTextContent(
          "*Not italic* and [not a link](https://liveblocks.io)."
        );
      },
    },
    {
      description: "HTML entities",
      content: dedent`
        &lt;p&gt; &amp;

        > &quot; &apos;

        - &copy; &trade;
      `,
      assertions: (element) => {
        expect(element.querySelector("p")).toHaveTextContent("<p> &");
        expect(element.querySelector("blockquote")).toHaveTextContent("\" '");
        expect(element.querySelector("li")).toHaveTextContent("© ™");
      },
    },
    {
      description: "HTML elements (as plain text)",
      content: dedent`
        The abbreviation for HyperText Markup Language is <abbr title="HyperText Markup Language">HTML</abbr>.

        Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

        This is <mark>highlighted</mark> text.

        E = mc<sup>2</sup>
      `,
      assertions: (element) => {
        const paragraphs = element.querySelectorAll("p");
        expect(paragraphs).toHaveLength(4);

        expect(paragraphs[0]).toHaveTextContent(
          "The abbreviation for HyperText Markup Language is HTML."
        );
        expect(paragraphs[1]).toHaveTextContent("Press Ctrl + C to copy.");
        expect(paragraphs[2]).toHaveTextContent("This is highlighted text.");
        expect(paragraphs[3]).toHaveTextContent("E = mc2");
      },
    },
  ] satisfies {
    description: string;
    content: string;
    assertions: (element: HTMLElement) => void;
  }[])("should render $description", ({ content, assertions }) => {
    const { getByTestId } = render(
      <Markdown data-testid="markdown" content={content} />
    );

    assertions(getByTestId("markdown"));
  });

  test("should rerender when the content changes", () => {
    const { getByTestId, rerender } = render(
      <Markdown data-testid="markdown" content="This is a [link](ht" />
    );

    const element = getByTestId("markdown");

    expect(element).toHaveTextContent("This is a [link](ht");
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

  test.each([
    {
      description: "paragraphs",
      content: dedent`A paragraph.`,
      components: {
        Paragraph: ({ children }) => <p data-paragraph>{children}</p>,
      },
      assertions: (element) => {
        const paragraph = element.querySelector("p");

        expect(paragraph).toBeInTheDocument();
        expect(paragraph).toHaveTextContent("A paragraph.");
      },
    },
    {
      description: "headings",
      content: dedent`
        # Heading 1

        ## Heading 2

        ### Heading 3

        #### Heading 4

        ##### Heading 5

        ###### Heading 6
      `,
      components: {
        Heading: ({ children, level }) => {
          const Heading = `h${level}` as const;

          return <Heading data-heading={level}>{children}</Heading>;
        },
      },
      assertions: (element) => {
        const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
        expect(headings).toHaveLength(6);

        headings.forEach((heading, index) => {
          expect(heading).toHaveAttribute("data-heading", String(index + 1));
          expect(heading).toHaveTextContent(`Heading ${index + 1}`);
        });
      },
    },
    {
      description: "inline elements",
      content: dedent`
        This is **bold text**, _italic text_, **_bold and italic_**, ~~strikethrough~~, \`inline code\`, and **\`bold inline code\`**. 
      `,
      components: {
        Inline: ({ children, type }) => {
          const Inline = type;

          return <Inline data-inline={type}>{children}</Inline>;
        },
      },
      assertions: (element) => {
        const strongs = element.querySelectorAll("strong");
        expect(strongs).toHaveLength(3);
        expect(strongs[0]).toHaveTextContent("bold text");
        expect(strongs[0]).toHaveAttribute("data-inline", "strong");
        expect(strongs[1]).toHaveTextContent("bold and italic");
        expect(strongs[1]).toHaveAttribute("data-inline", "strong");
        expect(strongs[2]).toHaveTextContent("bold inline code");
        expect(strongs[2]).toHaveAttribute("data-inline", "strong");

        const italics = element.querySelectorAll("em");
        expect(italics).toHaveLength(2);
        expect(italics[0]).toHaveTextContent("italic text");
        expect(italics[0]).toHaveAttribute("data-inline", "em");
        expect(italics[1]).toHaveTextContent("bold and italic");
        expect(italics[1]).toHaveAttribute("data-inline", "em");

        const strikethroughs = element.querySelectorAll("del");
        expect(strikethroughs).toHaveLength(1);
        expect(strikethroughs[0]).toHaveTextContent("strikethrough");
        expect(strikethroughs[0]).toHaveAttribute("data-inline", "del");

        const codes = element.querySelectorAll("code");
        expect(codes).toHaveLength(2);
        expect(codes[0]).toHaveTextContent("inline code");
        expect(codes[0]).toHaveAttribute("data-inline", "code");
        expect(codes[1]).toHaveTextContent("bold inline code");
        expect(codes[1]).toHaveAttribute("data-inline", "code");
      },
    },
    {
      description: "links",
      content: dedent`
        A [link](https://www.liveblocks.io), [another one](/docs "With a title"),
        https://www.liveblocks.io, and <https://www.liveblocks.io>.
      `,
      components: {
        Link: ({ href, title, children }) => (
          <a href={href} title={title} data-link>
            {children}
          </a>
        ),
      },
      assertions: (element) => {
        const links = element.querySelectorAll("a");
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
      },
    },
    {
      description: "lists",
      content: dedent`
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
      components: {
        List: ({ items, type, start }) => {
          const List = type === "ordered" ? "ol" : "ul";

          return (
            <List start={start} data-list={type}>
              {items.map((item, index) => (
                <li key={index}>
                  {item.checked !== undefined && (
                    <>
                      <input type="checkbox" disabled checked={item.checked} />{" "}
                    </>
                  )}
                  {item.children}
                </li>
              ))}
            </List>
          );
        },
      },
      assertions: (element) => {
        const rootList = element.querySelector(":scope > ul");
        expect(rootList).toHaveAttribute("data-list");

        const rootListItems = element.querySelectorAll(":scope > ul > li");
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

        const secondNestedListItems = secondNestedList?.querySelectorAll("li");
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

        const thirdNestedLists = thirdRootListItem?.querySelectorAll("ol, ul");
        expect(thirdNestedLists).toHaveLength(3);

        expect(thirdNestedLists?.[0]).toHaveAttribute("data-list", "ordered");
        expect(thirdNestedLists?.[0]?.querySelector("li")).toHaveTextContent(
          "A list item"
        );

        expect(thirdNestedLists?.[1]).toHaveAttribute("data-list", "unordered");
        expect(thirdNestedLists?.[1]?.querySelector("li")).toHaveTextContent(
          "Another list item"
        );

        expect(thirdNestedLists?.[2]).toHaveAttribute("data-list", "unordered");
        expect(thirdNestedLists?.[2]?.querySelector("li")).toHaveTextContent(
          "Yet another list item"
        );
        expect(
          thirdNestedLists?.[2]?.querySelector("input[type='checkbox']")
        ).toBeChecked();
      },
    },
    {
      description: "blockquotes",
      content: dedent`
        > A blockquote.

        > Another one which spans
        >
        > multiple paragraphs.

        > Yet another which
        >
        > > is nested.
      `,
      components: {
        Blockquote: ({ children }) => (
          <blockquote data-blockquote>{children}</blockquote>
        ),
      },
      assertions: (element) => {
        const blockquotes = element.querySelectorAll("blockquote");
        expect(blockquotes).toHaveLength(4);

        expect(blockquotes[0]).toHaveTextContent("A blockquote.");
        expect(blockquotes[0]).toHaveAttribute("data-blockquote");
        expect(blockquotes[1]).toHaveTextContent(
          "Another one which spansmultiple paragraphs."
        );
        expect(blockquotes[1]).toHaveAttribute("data-blockquote");
        expect(blockquotes[2]).toHaveTextContent("Yet another whichis nested.");
        expect(blockquotes[2]).toHaveAttribute("data-blockquote");
        expect(blockquotes[3]).toHaveTextContent("is nested.");
        expect(blockquotes[3]).toHaveAttribute("data-blockquote");
      },
    },
    {
      description: "code blocks",
      content: dedent`
        \`\`\`
        p {
          color: #000;
        }
        \`\`\`

        \`\`\`javascript
        const a = 2;
        \`\`\`
      `,
      components: {
        CodeBlock: ({ code, language }) => (
          <pre data-code-block>
            <code data-language={language}>{code}</code>
          </pre>
        ),
      },
      assertions: (element) => {
        const codeBlocks = element.querySelectorAll("pre");
        expect(codeBlocks).toHaveLength(2);

        expect(codeBlocks[0]).toHaveTextContent("p { color: #000; }");
        expect(codeBlocks[0]).toHaveAttribute("data-code-block");
        expect(codeBlocks[1]).toHaveTextContent("const a = 2;");
        expect(codeBlocks[1]).toHaveAttribute("data-code-block");
        expect(codeBlocks[1]?.querySelector("code")).toHaveAttribute(
          "data-language",
          "javascript"
        );
      },
    },
    {
      description: "images",
      content: dedent`
        ![An image](https://www.liveblocks.io/favicon.png)
      `,
      components: {
        Image: ({ src, alt }) => <img src={src} alt={alt} data-image />,
      },
      assertions: (element) => {
        const image = element.querySelector("img");

        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute(
          "src",
          "https://www.liveblocks.io/favicon.png"
        );
        expect(image).toHaveAttribute("alt", "An image");
      },
    },
    {
      description: "tables",
      content: dedent`
        | Feature       | Example                              | Notes                     |
        | ------------- | ------------------------------------ | ------------------------- |
        | Link          | [Liveblocks](https://liveblocks.io/) | External link             |
        | Inline code   | \`const a = 2;\`                    | Code inside table         |
        | Bold text     | **Important**                        | Styling test              |
        | Italic text   | _Emphasis_                           | Test italic inside tables |
        | Strikethrough | ~~Deprecated~~                       | Show removal              |
      `,
      components: {
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
      assertions: (element) => {
        const table = element.querySelector("table");

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
      },
    },
    {
      description: "separators",
      content: dedent`
        ***

        ---

        _____
      `,
      components: {
        Separator: () => <hr data-separator />,
      },
      assertions: (element) => {
        const separators = element.querySelectorAll("hr");
        expect(separators).toHaveLength(3);

        separators.forEach((separator) => {
          expect(separator).toHaveAttribute("data-separator");
        });
      },
    },
  ] satisfies {
    description: string;
    content: string;
    components: Partial<MarkdownComponents>;
    assertions: (element: HTMLElement) => void;
  }[])(
    "should support overriding $description",
    ({ content, components, assertions }) => {
      const { getByTestId } = render(
        <Markdown
          data-testid="markdown"
          content={content}
          components={components}
        />
      );

      assertions(getByTestId("markdown"));
    }
  );
});
