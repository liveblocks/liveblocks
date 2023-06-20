import React, { ReactNode } from 'react'

type MenuItemProps = {
  icon?: ReactNode;
  title?: string;
  action?: () => void;
  isActive?: null | (() => boolean);
}

const MenuItem = ({
  icon, title, action, isActive = null,
}: MenuItemProps) => (
  <button
    className={`menu-item${isActive && isActive() ? ' is-active' : ''}`}
    onClick={action}
    title={title}
  >
    {icon}
  </button>
)

export default MenuItem;