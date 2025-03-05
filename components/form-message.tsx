import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface Message {
  type?: 'error' | 'success' | 'info';
  message?: string;
}

interface FormMessageProps {
  message: Message;
  className?: string;
}

export function FormMessage({ message, className = '' }: FormMessageProps) {
  if (!message.type || !message.message) {
    return null;
  }

  const icons = {
    error: <AlertCircle className="h-4 w-4" />,
    success: <CheckCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  const styles = {
    error: 'border-destructive bg-destructive/10 text-destructive',
    success: 'border-green-600 bg-green-600/10 text-green-600',
    info: 'border-blue-500 bg-blue-500/10 text-blue-500',
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-3 ${styles[message.type]} ${className}`}
    >
      {icons[message.type]}
      <p className="text-sm">{message.message}</p>
    </div>
  );
}
