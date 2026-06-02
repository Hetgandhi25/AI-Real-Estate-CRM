import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";
import { Form } from "@/components/ui/form";

type AppFormProps<T extends FieldValues> = {
  schema: z.ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (values: T, methods: UseFormReturn<T>) => void | Promise<void>;
  children: (methods: UseFormReturn<T>) => ReactNode;
  className?: string;
};

export function AppForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: AppFormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema as unknown as Parameters<typeof zodResolver>[0]) as Resolver<T>,
    defaultValues,
  });

  return (
    <Form {...methods}>
      <form
        onSubmit={methods.handleSubmit((values) => onSubmit(values, methods))}
        className={className}
      >
        {children(methods)}
      </form>
    </Form>
  );
}
