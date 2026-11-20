import * as Dialog from "@radix-ui/react-dialog";

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Hello Company Board</h1>
      <Dialog.Root>
        <Dialog.Trigger className="rounded bg-slate-900 px-3 py-1 text-white">About</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-white p-6">
            <Dialog.Title className="font-semibold">Company Board</Dialog.Title>
            <Dialog.Description>Walking skeleton.</Dialog.Description>
            <Dialog.Close className="mt-4 underline">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
