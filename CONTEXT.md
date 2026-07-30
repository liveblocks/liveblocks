# Liveblocks

Liveblocks provides products for adding collaborative experiences to
applications. This glossary records the public product language used across the
documentation.

## Language

**Sync**:
The hosted Liveblocks sync-engine product for synchronizing and persisting
collaborative application state.
_Avoid_: Storage or Liveblocks Storage when naming the product

**Storage**:
The persisted, conflict-free data model inside Sync, exposed through public APIs
such as `Storage`, `useStorage`, and `/storage/json-patch`.
_Avoid_: Sync when referring specifically to the data model or its API
identifiers

**Liveblocks Yjs**:
The Yjs provider and persisted Yjs document support offered as part of Sync.
_Avoid_: Treating Yjs only as a multiplayer-document use case

**LiveText**:
A collaborative rich-text data type inside Storage that can power integrations
with different text editors.
_Avoid_: Presenting LiveText as a separate product from Sync

**Data type**:
A Storage value with defined synchronization and persistence behavior, such as
`LiveObject`, `LiveList`, `LiveMap`, `LiveFile`, or `LiveText`.
_Avoid_: Including ephemeral Presence data in this category

**AI Copilots**:
The Liveblocks product for building AI assistant interfaces and behavior.
_Avoid_: Treating AI Copilots only as an AI collaboration use case

**AI collaboration**:
A use case that combines products such as Sync, Feeds, Comments, Notifications,
and AI Copilots so humans and agents can work together.
_Avoid_: Using AI collaboration as the name of a single product

**Sync integration**:
A supported way to connect Sync to an editor, diagramming library, or state
management library.
_Avoid_: Giving each integration its own product-level navigation branch

**Use case**:
A concrete application surface built from one or more Liveblocks products, such
as a canvas, code editor, text editor, flowchart, spreadsheet, or table.
_Avoid_: Using an individual package or integration name as a use case

**Product landing page**:
A short product entry point with a concise description, video, and links to the
product’s main documentation pages.
_Avoid_: Treating the landing page as the detailed product explanation

**Product overview page**:
The detailed explanation of what a product is, when to use it, and which
capabilities it includes.
_Avoid_: Duplicating low-level concepts or API-reference detail

## Relationships

- **Sync** contains **Storage**
- **Sync** contains **Liveblocks Yjs**
- **Storage** contains **LiveText** documents
- **Storage** is composed from one or more **Data types**
- **Storage** API names remain unchanged when the sync-engine product is named
  **Sync**
- **AI collaboration** can combine **AI Copilots** with other Liveblocks
  products
- **LiveText** is the recommended Sync foundation for new text-editor
  integrations
- **Sync integrations** are indexed on one product page and linked from
  relevant **Use cases**
- A **Product landing page** links to its **Product overview page**

## Example dialogue

> **Developer:** "Does adopting **Sync** require renaming `useStorage`?"
> **Domain expert:** "No. **Sync** is the product name; `useStorage` reads the
> **Storage** data model inside it."

## Flagged ambiguities

- "Storage" previously referred to both the sync-engine product and the
  persisted data model inside it. Resolved: use **Sync** for the product and
  **Storage** for the data model and its published API names.
- Text editing and flowcharts were considered use cases. Resolved: document
  the application surfaces as **Use cases**, while the packages and libraries
  that enable them are **Sync integrations** listed on one page.
- An abandoned self-hosted product called "Resync" appeared in an early overview
  draft. Resolved: document only hosted **Sync** and existing `@liveblocks/*`
  APIs; do not describe Sync as open source or self-hostable.
