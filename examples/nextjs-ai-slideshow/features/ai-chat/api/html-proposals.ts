export type HtmlProposal = { slideId: string; html: string };

const HTML_FENCE_OPEN_PATTERN =
  /```html(?:[ \t]+(?:(?:id=([^\s`]+))|(new)))?[ \t]*(?:\r?\n|$)/gi;

export function extractHtmlProposal(text: string, currentSlideId: string) {
  return {
    content: stripHtmlFencesForChat(text),
    proposals: collectHtmlProposals(text, currentSlideId, false),
  };
}

export function extractStreamingHtml(
  text: string,
  currentSlideId: string
): HtmlProposal[] | undefined {
  const proposals = collectHtmlProposals(text, currentSlideId, true);
  return proposals.length > 0 ? proposals : undefined;
}

export function stripHtmlFencesForChat(text: string) {
  const pattern = new RegExp(HTML_FENCE_OPEN_PATTERN);
  let result = "";
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match) {
    result += text.slice(lastIndex, match.index);

    const closeIndex = text.indexOf("```", pattern.lastIndex);
    if (closeIndex === -1) {
      return result.trim();
    }

    lastIndex = closeIndex + "```".length;
    pattern.lastIndex = lastIndex;
    match = pattern.exec(text);
  }

  return (result + text.slice(lastIndex)).trim();
}

function collectHtmlProposals(
  text: string,
  currentSlideId: string,
  includeOpenFence: boolean
) {
  const proposals: HtmlProposal[] = [];
  const pattern = new RegExp(HTML_FENCE_OPEN_PATTERN);
  let searchIndex = 0;

  while (searchIndex < text.length) {
    pattern.lastIndex = searchIndex;
    const match = pattern.exec(text);
    if (!match) {
      break;
    }

    const bodyStart = pattern.lastIndex;
    const closeIndex = text.indexOf("```", bodyStart);
    const slideId = match[2] === "new" ? "new" : (match[1] ?? currentSlideId);

    if (closeIndex === -1) {
      if (includeOpenFence) {
        addProposal(proposals, {
          slideId,
          html: text.slice(bodyStart).trim(),
        });
      }
      break;
    }

    addProposal(proposals, {
      slideId,
      html: text.slice(bodyStart, closeIndex).trim(),
    });
    searchIndex = closeIndex + "```".length;
  }

  return proposals.filter((proposal) => proposal.html.length > 0);
}

function addProposal(proposals: HtmlProposal[], proposal: HtmlProposal) {
  if (proposal.slideId !== "new") {
    const existingIndex = proposals.findIndex(
      (item) => item.slideId === proposal.slideId
    );
    if (existingIndex !== -1) {
      proposals.splice(existingIndex, 1);
    }
  }

  proposals.push(proposal);
}
