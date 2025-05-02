"use client"

import { Divider } from "@/components/Divider"
import Approvers from "./_components/Approvers"
import AuditRules from "./_components/AuditRules"
import TransactionPolicy from "./_components/TransactionPolicy"

export default function Audit() {
  return (
    <div>
      <AuditRules />
      <Divider className="my-10" />
      <Approvers />
      <Divider className="my-10" />
      <TransactionPolicy />
    </div>
  )
}
