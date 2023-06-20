import React, { Fragment } from 'react'
import { type Editor } from '@tiptap/react'
import { Icon } from '@iconify/react';
import MenuItem from './MenuItem'

const ICON_WIDTH = 18;
const ICON_HEIGHT = 18;

const MenuBar = ({ editor }: { editor: Editor }) => {
  const items = [
    {
      icon: <Icon icon="ri:bold" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <Icon icon="ri:italic" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <Icon icon="ri:strikethrough" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Strike',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      icon: <Icon icon="ri:code-view" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Code',
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
    },
    {
      icon: <Icon icon="ri:mark-pen-line" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Highlight',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: () => editor.isActive('highlight'),
    },
    {
      type: 'divider',
    },
    {
      icon: <Icon icon="ri:h-1" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <Icon icon="ri:h-2" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      icon: <Icon icon="ri:paragraph" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Paragraph',
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive('paragraph'),
    },
    {
      icon: <Icon icon="ri:list-unordered" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <Icon icon="ri:list-ordered" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: <Icon icon="ri:list-check-2" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Task List',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
    },
    {
      icon: <Icon icon="ri:code-box-line" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Code Block',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      type: 'divider',
    },
    {
      icon: <Icon icon="ri:double-quotes-l" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      icon: <Icon icon="ri:separator" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Horizontal Rule',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      type: 'divider',
    },
    {
      icon: <Icon icon="ri:text-wrap" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Hard Break',
      action: () => editor.chain().focus().setHardBreak().run(),
    },
    {
      icon: <Icon icon="ri:format-clear" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Clear Format',
      action: () => editor.chain().focus().clearNodes().unsetAllMarks()
        .run(),
    },
    {
      type: 'divider',
    },
    {
      icon: <Icon icon="ri:arrow-go-back-line" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Undo',
      action: () => editor.chain().focus().undo().run(),
    },
    {
      icon: <Icon icon="ri:arrow-go-forward-line" width={ICON_WIDTH} height={ICON_HEIGHT} />,
      title: 'Redo',
      action: () => editor.chain().focus().redo().run(),
    },
  ]

  return (
    <div className="editor__header">
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.type === 'divider' ? <div className="divider" /> : <MenuItem {...item} />}
        </Fragment>
      ))}
    </div>
  )
}

export default MenuBar;