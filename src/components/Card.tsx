import { PropsWithChildren } from 'react'
export default function Card({ children }: PropsWithChildren) {
  return <div className="rounded-2xl border p-4">{children}</div>
}
