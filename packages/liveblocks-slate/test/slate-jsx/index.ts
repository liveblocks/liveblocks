import { createHyperscript } from "slate-hyperscript";

export const jsx = createHyperscript({
	elements: {
		unstyled: { type: "unstyled" },
		h1: { type: "header-one" },
		ul: { type: "unordered-list" },
		"ul-li": { type: "unordered-list-item" },
		link: { type: "link" },
		"note-link": { type: "note-link" },
	},
});
