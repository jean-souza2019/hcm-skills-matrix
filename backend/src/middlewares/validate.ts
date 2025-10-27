import type { NextFunction, Request, Response } from 'express';
import type { ZodIssue, ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

const formatIssue = (issue: ZodIssue, fallbackField: string) => {
  const path = issue.path.length ? issue.path.join('.') : fallbackField;

  return {
    path,
    code: issue.code,
    message: issue.message,
    expected: 'expected' in issue ? issue.expected : undefined,
    received: 'received' in issue ? issue.received : undefined,
  };
};

const assignValidatedValue = (
  req: Request,
  target: RequestPart,
  value: unknown,
) => {
  const findDescriptor = (obj: unknown): PropertyDescriptor | undefined => {
    let current = obj;
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(
        current as object,
        target,
      );
      if (descriptor) {
        return descriptor;
      }
      current = Object.getPrototypeOf(current);
    }
    return undefined;
  };

  const descriptor = findDescriptor(req);

  if (descriptor?.set) {
    descriptor.set.call(req, value);
    return;
  }

  if (descriptor?.writable) {
    (req as any)[target] = value;
    return;
  }

  Object.defineProperty(req, target, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
};

export function validate(schema: ZodSchema, target: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req[target]);

      if (!result.success) {
        const issues = result.error.issues.map((issue) =>
          formatIssue(issue, target),
        );

        const firstIssue = issues[0];
        const field = firstIssue?.path || target;

        return res.status(400).json({
          message: firstIssue
            ? `Erro de validação no campo "${field}": ${firstIssue.message}`
            : 'Validação falhou.',
          target,
          issues,
        });
      }

      assignValidatedValue(req, target, result.data);
      next();
    } catch (error) {
      const details =
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: 'Erro desconhecido ao validar os dados.' };

      return res.status(400).json({
        message: `Não foi possível validar o ${target}.`,
        target,
        details,
      });
    }
  };
}
