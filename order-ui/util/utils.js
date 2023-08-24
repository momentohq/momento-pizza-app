import { Badge } from '@aws-amplify/ui-react';
export const getStatusBadge = (status, size = "large") => {
  let label, variation;
  switch (status) {
    case 'SUBMITTED':
      label = 'Pending';
      variation = 'info';
      break;
    case 'IN PROGRESS':
      label = 'Being Made';
      variation = 'warning';
      break;
    case 'COMPLETED':
      label = 'Out for Delivery';
      variation = 'success';
      break;
    case 'REJECTED':
      label = 'Rejected';
      variation = 'error';
      break;
    case 'WAITING ON CUSTOMER':
      label = 'In Cart';
      variation = '';
      break;
    default:
      label = status;
      variation = '';
      break;
  };

  return (<Badge size={size} variation={variation}>{label}</Badge>);
};