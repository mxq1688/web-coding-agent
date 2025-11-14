# CodeBanana Base Template - Coding Guide

> Clean, clear, and AI-friendly development guidelines

## 🎯 Core Principles

- **Simplicity First**: Keep code simple and direct, avoid over-abstraction
- **Single Responsibility**: Each component does one thing
- **Type Safety**: Use TypeScript with explicit type definitions
- **Consistency**: Follow unified naming and structural conventions

---

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx        # Home page
│   ├── layout.tsx      # Root layout
│   └── api/            # API routes
├── components/         # Reusable components
│   ├── ui/            # Base UI components
│   └── features/      # Feature components
├── lib/               # Utility functions
├── store/             # Zustand state management
└── types/             # TypeScript type definitions
```

---

## 📝 Naming Conventions

### File Naming
- Component files: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- Utility functions: `kebab-case.ts` (e.g., `format-date.ts`)
- Type files: `kebab-case.types.ts` (e.g., `user.types.ts`)

### Variable Naming
- React components: `PascalCase` (e.g., `UserProfile`)
- Functions/variables: `camelCase` (e.g., `getUserData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Types/interfaces: `PascalCase` (e.g., `UserData`)

---

## ⚛️ Component Guidelines

### Basic Component Template

```tsx
// components/UserCard.tsx
interface UserCardProps {
  name: string;
  email: string;
  onEdit?: () => void;
}

export default function UserCard({ name, email, onEdit }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-gray-600">{email}</p>
      {onEdit && (
        <button onClick={onEdit} className="mt-2 text-blue-500">
          Edit
        </button>
      )}
    </div>
  );
}
```

### Component Rules
1. **Props Types**: Always define Props interface
2. **Default Export**: Use `export default` for components
3. **Client Components**: Add `"use client"` when interaction is needed
4. **Simplicity**: Keep components under 150 lines, split if exceeded

---

## 🎨 Style Guidelines

### Tailwind CSS Usage
```tsx
// ✅ Recommended: Clear class name grouping
<div className="
  flex items-center justify-between
  rounded-lg border border-gray-200
  p-4 shadow-sm
  hover:shadow-md transition-shadow
">

// ❌ Avoid: Long single-line class names
<div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
```

### Utility Function cn()
```tsx
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn("p-4 rounded", isActive && "bg-blue-500")} />
```

---

## 🗄️ State Management (Zustand)

### Store Definition
```tsx
// store/user-store.ts
import { create } from "zustand";

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### Usage
```tsx
"use client";

import { useUserStore } from "@/store/user-store";

export default function Profile() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  
  return <div>{user?.name}</div>;
}
```

---

## 🛣️ Routing and Pages

### Page Components
```tsx
// app/users/page.tsx
export default function UsersPage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">User List</h1>
      {/* Content */}
    </main>
  );
}
```

### API Routes
```tsx
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const users = await fetchUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  // Handle logic
  return NextResponse.json({ success: true });
}
```

---

## 🔧 Common Utility Functions

### File Locations
```
src/lib/utils.ts        # General utilities
src/lib/api.ts          # API related
src/lib/format.ts       # Formatting functions
```

### Examples
```tsx
// lib/utils.ts
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US").format(date);
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}
```

---

## 📦 Dependencies Guide

| Package | Purpose | Usage |
|---------|---------|-------|
| `lucide-react` | Icons | `import { User } from "lucide-react"` |
| `zustand` | State management | Global state (user, theme, etc.) |
| `@radix-ui/*` | Headless components | Dialogs, dropdowns, etc. |
| `framer-motion` | Animations | Page transitions, component animations |
| `next-themes` | Theme switching | Dark/light mode |

---

## ✅ Best Practices

### 1. Data Fetching
```tsx
// Server Component (default)
async function UserList() {
  const users = await fetch("https://api.example.com/users").then(r => r.json());
  return <div>{users.map(...)}</div>;
}

// Client Component (needs interactivity)
"use client";
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => { /* fetch data */ }, []);
  return <div>{users.map(...)}</div>;
}
```

### 2. Error Handling
```tsx
// app/users/error.tsx
"use client";

export default function Error({ error, reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-red-500">{error.message}</p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Retry
      </button>
    </div>
  );
}
```

### 3. Loading States
```tsx
// app/users/loading.tsx
export default function Loading() {
  return <div className="p-6">Loading...</div>;
}
```

---

## 🚫 What to Avoid

1. ❌ Using `useState`/`useEffect` in Server Components
2. ❌ Nesting components more than 3-4 levels deep
3. ❌ Inline styles (`style={{}}`), use Tailwind instead
4. ❌ Overusing global state, prefer props
5. ❌ Missing TypeScript type definitions

---

## 🎯 Development Workflow

### Adding New Features
1. Create route pages in `src/app`
2. Create components in `src/components`
3. Create stores in `src/store` when global state is needed
4. Add utility functions to `src/lib`
5. Define types in `src/types`


## 📚 Quick Reference

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Radix UI**: https://www.radix-ui.com/

---

**Remember: Code should be simple, clear, and easy to understand. When in doubt, choose the simplest solution.**

