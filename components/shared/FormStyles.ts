// Form label styles
export const formLabelStyles = "text-xs font-medium text-gray-700 dark:text-gray-200";
export const formLabelErrorStyles = "text-xs font-medium text-red-500 dark:text-red-400";

// Form input styles
export const formInputStyles = "w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-gray-700 dark:to-gray-800 dark:border-gray-600";
export const formInputErrorStyles = "w-full h-8 bg-gradient-to-r from-red-50 to-red-100 border-red-500 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-500";

// Form select styles
export const formSelectStyles = "w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-gray-700 dark:to-gray-800 dark:border-gray-600";
export const formSelectErrorStyles = "w-full h-8 bg-gradient-to-r from-red-50 to-red-100 border-red-500 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-500";

// Form error message styles
export const formErrorStyles = "text-xs text-red-500 dark:text-red-400 mt-1";

// Form helper text styles
export const formHelperStyles = "text-[10px] text-gray-500 dark:text-gray-400 mt-1";

// Form section styles
export const formSectionStyles = "space-y-4";
export const formGroupStyles = "space-y-1";

// Form button styles
export const formButtonStyles = {
  primary: "w-full h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800",
  secondary: "w-full h-8 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 hover:from-gray-100 hover:to-gray-200 dark:from-gray-700 dark:to-gray-800 dark:border-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-700",
  outline: "w-full h-8 border border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
};

// Form loading states
export const formLoadingStates = {
  submitting: "Processing...",
  saving: "Saving...",
  loading: "Loading...",
  creating: "Creating...",
  updating: "Updating...",
  deleting: "Deleting..."
};

// Form validation messages
export const formValidationMessages = {
  required: "This field is required",
  invalidEmail: "Please enter a valid email address",
  invalidPhone: "Please enter a valid phone number",
  invalidDate: "Please enter a valid date",
  invalidNumber: "Please enter a valid number",
  minLength: (length: number) => `Must be at least ${length} characters`,
  maxLength: (length: number) => `Must be at most ${length} characters`
};

// Form placeholders
export const formPlaceholders = {
  search: "Search...",
  select: "Select an option",
  date: "Select date",
  time: "Select time",
  email: "Enter email address",
  phone: "Enter phone number",
  name: "Enter full name",
  address: "Enter address",
  notes: "Enter notes",
  quantity: "Enter quantity",
  price: "Enter price",
  description: "Enter description"
}; 