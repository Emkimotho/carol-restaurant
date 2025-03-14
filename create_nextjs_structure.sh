# Create root-level files
touch .env .gitignore .npmrc .nvmrc babel.config.js jsconfig.json package.json package-lock.json readme.md static.json

# Create public directories and files
mkdir -p public/images/meals public/images/icons public/fonts public/assets/pdfs
touch public/favicon.ico public/index.html

# Create App Router directories and nested routes
mkdir -p app/about app/contact app/reservation app/catering app/harambee54 app/chef app/careers app/events app/login app/unauthorized app/verify-email app/menu/[section]/[category] app/cart app/checkout app/password-reset/confirm
mkdir -p app/dashboard/customer/profile app/dashboard/customer/order-history app/dashboard/customer/event-history app/dashboard/customer/reservations app/dashboard/customer/order-tracking app/dashboard/customer/favorites
mkdir -p app/dashboard/driver/profile app/dashboard/driver/assigned-orders app/dashboard/driver/deliveries app/dashboard/driver/history app/dashboard/driver/earnings app/dashboard/driver/notifications
mkdir -p app/dashboard/staff/profile app/dashboard/staff/order-management
mkdir -p app/dashboard/admin/profile app/dashboard/admin/menu-management app/dashboard/admin/orders app/dashboard/admin/contact-forms app/dashboard/admin/event-bookings app/dashboard/admin/reservations
mkdir -p app/dashboard/superadmin/profile app/dashboard/superadmin/staff-management app/dashboard/superadmin/driver-management app/dashboard/superadmin/settings

# Create essential App Router files
touch app/layout.tsx app/page.tsx app/head.tsx app/globals.css app/tailwind.css

# Create nested route pages
touch app/about/page.tsx
touch app/contact/page.tsx
touch app/reservation/page.tsx
touch app/catering/page.tsx
touch app/harambee54/page.tsx
touch app/chef/page.tsx
touch app/careers/page.tsx
touch app/events/page.tsx
touch app/login/page.tsx
touch app/unauthorized/page.tsx
touch app/verify-email/page.tsx
touch app/404/page.tsx
touch app/menu/page.tsx
touch app/menu/[section]/page.tsx
touch app/menu/[section]/[category]/page.tsx
touch app/cart/page.tsx
touch app/checkout/page.tsx
touch app/password-reset/page.tsx
touch app/password-reset/confirm/page.tsx

# Create dashboard pages
touch app/dashboard/page.tsx

# Customer Dashboard
touch app/dashboard/customer/layout.tsx
touch app/dashboard/customer/page.tsx
touch app/dashboard/customer/profile/page.tsx
touch app/dashboard/customer/order-history/page.tsx
touch app/dashboard/customer/event-history/page.tsx
touch app/dashboard/customer/reservations/page.tsx
touch app/dashboard/customer/order-tracking/page.tsx
touch app/dashboard/customer/favorites/page.tsx

# Driver Dashboard
touch app/dashboard/driver/layout.tsx
touch app/dashboard/driver/page.tsx
touch app/dashboard/driver/profile/page.tsx
touch app/dashboard/driver/assigned-orders/page.tsx
touch app/dashboard/driver/deliveries/page.tsx
touch app/dashboard/driver/history/page.tsx
touch app/dashboard/driver/earnings/page.tsx
touch app/dashboard/driver/notifications/page.tsx

# Staff Dashboard
touch app/dashboard/staff/layout.tsx
touch app/dashboard/staff/page.tsx
touch app/dashboard/staff/profile/page.tsx
touch app/dashboard/staff/order-management/page.tsx

# Admin Dashboard
touch app/dashboard/admin/layout.tsx
touch app/dashboard/admin/page.tsx
touch app/dashboard/admin/profile/page.tsx
touch app/dashboard/admin/menu-management/page.tsx
touch app/dashboard/admin/orders/page.tsx
touch app/dashboard/admin/contact-forms/page.tsx
touch app/dashboard/admin/event-bookings/page.tsx
touch app/dashboard/admin/reservations/page.tsx

# SuperAdmin Dashboard
touch app/dashboard/superadmin/layout.tsx
touch app/dashboard/superadmin/page.tsx
touch app/dashboard/superadmin/profile/page.tsx
touch app/dashboard/superadmin/staff-management/page.tsx
touch app/dashboard/superadmin/driver-management/page.tsx
touch app/dashboard/superadmin/settings/page.tsx

# Create components directories
mkdir -p components/Header components/Footer components/SidebarCart components/ScrollToTop components/Preloader components/ProtectedRoute components/Banner components/Blog components/DetailedItemView components/FloatingCartBar components/Gallery components/MainContent components/MenuItem components/MenuPreview components/NeonSign components/Popup components/NotificationsBell

# Create component files
for component in Header Footer SidebarCart ScrollToTop Preloader ProtectedRoute Banner Blog DetailedItemView FloatingCartBar Gallery MainContent MenuItem MenuPreview NeonSign Popup NotificationsBell; do
  touch components/$component/$component.tsx components/$component/$component.module.css
done

# Create contexts directories and files
mkdir -p contexts
touch contexts/AuthContext.tsx contexts/CartContext.tsx contexts/NotificationContext.tsx contexts/UserContext.tsx contexts/OpeningHoursContext.tsx

# Create services directories and files
mkdir -p services
touch services/GoogleMapsService.ts services/EmailService.ts services/NotificationsService.ts services/OrderTrackingService.ts

# Create utils directories and files
mkdir -p utils
touch utils/api.ts utils/auth.ts utils/deliveryFeeCalculator.ts utils/notificationHelpers.ts utils/user.ts utils/validation.ts

# Create styles directories and files
mkdir -p styles
touch styles/globals.css styles/variables.css styles/mixins.css styles/base.css

# Create assets directories and files
mkdir -p assets/css assets/fonts assets/img assets/mail
touch assets/css/base.css assets/css/index.css

# Create configuration files
touch tailwind.config.js postcss.config.js tsconfig.json next.config.js next-env.d.ts
