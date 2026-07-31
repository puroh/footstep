# Requirements Document

## Introduction

The client-ordering module handles the customer-facing flow: browsing the restaurant menu via a shareable URL, selecting products with toppings, choosing delivery type and payment method, and confirming an order. The restaurant manually shares its URL with the client via messaging (Telegram or WhatsApp). No automated bot is involved.

Depends on: restaurant-admin module (restaurant with products and payment methods must exist).

## Glossary

- **Client**: End user who places an order through the menu interface.
- **Restaurant Slug**: Unique, auto-generated identifier based on the restaurant name, used in the public URL.
- **Menu**: Set of categories and products available for a restaurant.
- **Cart**: Temporary client-side collection of items before order confirmation.
- **Order**: Persisted record containing items with toppings, delivery type, address, and payment method.
- **Payment Method**: A restaurant-configured option (cash, bank transfer, etc.) that the client selects at checkout.

## Requirements

### Requirement 1: Menu Access via Shared URL

**User Story:** As a client, I want to access the restaurant menu by clicking a link shared in chat, so that I can browse and order food.

#### Acceptance Criteria

1. WHEN the client navigates to the restaurant's public URL, THE system SHALL validate the slug and display the restaurant menu.
2. IF the slug does not correspond to an existing restaurant, THEN THE system SHALL display an error page indicating the restaurant was not found.
3. THE URL SHALL use the restaurant's auto-generated slug derived from the restaurant name.
4. THE system SHALL NOT require any login or authentication from the client to browse the menu or place orders.

### Requirement 2: Menu Browsing

**User Story:** As a client, I want to see the restaurant menu organized by categories with photos and names, so that I can explore and select the products I want to order.

#### Acceptance Criteria

1. WHEN the client accesses the menu with a valid restaurant slug, THE system SHALL display the menu separated by categories.
2. THE system SHALL show each product with its photo and name within its category.
3. WHEN the client taps a product photo or name, THE system SHALL navigate to the product detail view.
4. WHILE the client has at least one item in the cart, THE system SHALL display the total item count at the bottom of the screen.
5. THE system SHALL display "Cancel order" and "Pay" buttons at the bottom during menu navigation.
6. WHEN the client presses "Cancel order", THE system SHALL clear all cart items and return to the initial menu state.

### Requirement 3: Product Detail

**User Story:** As a client, I want to see product details with ingredients, toppings, and a special instructions field, so that I can customize my order before adding it.

#### Acceptance Criteria

1. WHEN the system shows the product detail view, THE system SHALL display the photo, name, and ingredients of the selected product.
2. THE system SHALL show all available toppings with their additional prices.
3. THE system SHALL show a free-text field for special instructions (e.g. "no onion", "well done").
4. WHEN the client presses "Accept", THE system SHALL add the item to the cart with selected toppings and instructions, then return to the main menu.
5. WHEN the client presses "Cancel", THE system SHALL discard changes and return to the main menu without modifying the cart.
6. THE system SHALL allow adding the same product multiple times with different toppings and instructions, creating an independent cart item each time.

### Requirement 4: Delivery Type Selection

**User Story:** As a client, I want to indicate how I want to receive my order, so that the restaurant can process it correctly.

#### Acceptance Criteria

1. WHEN the client presses "Pay", THE system SHALL show delivery type options: delivery, pickup, and dine-in.
2. WHEN the client selects "delivery", THE system SHALL show an address form with four fields: phone number, address, neighborhood, and city.
3. THE system SHALL display a mini map where the client can tap to mark the delivery location, storing the coordinates along with the address fields.
4. WHEN the client selects "pickup" or "dine-in", THE system SHALL show the restaurant address and a mini map with its location.
5. IF the client selects "delivery" and does not complete all four mandatory fields (phone number, address, neighborhood, city), THEN THE system SHALL block advancement and highlight the missing fields.
6. THE system SHALL ask the client for a phone number as a mandatory contact field regardless of delivery type, so the restaurant can reach the client if needed.

### Requirement 5: Payment Method Selection

**User Story:** As a client, I want to choose from the restaurant's configured payment methods, so that I can complete my order with my preferred option.

#### Acceptance Criteria

1. WHEN the client advances from delivery type selection, THE system SHALL display only the active payment methods configured by the restaurant.
2. WHEN the client selects a cash-type payment method, THE system SHALL show the order total, delivery fee separated (if applicable), and a field for the bill denomination the client will pay with.
3. WHEN the client selects a bank-transfer-type payment method, THE system SHALL show the transfer key, total amount, delivery fee (if applicable), and instructions to send the payment receipt via messaging chat.
4. WHEN the system shows a transfer key, THE system SHALL include a discreet button that copies the key to the clipboard.
5. IF the client selects a cash-type method and does not enter the bill denomination, THEN THE system SHALL block order confirmation and highlight the missing field.

### Requirement 6: Order Confirmation

**User Story:** As a client, I want to confirm my order so that the restaurant receives it with all details.

#### Acceptance Criteria

1. WHEN the client confirms the order, THE system SHALL persist the order with all items, toppings, special instructions, delivery type, address data (if applicable), and selected payment method.
2. WHEN the order is persisted, THE system SHALL send the complete order details as a message to the client's messaging chat.
3. THE message SHALL include: item list with toppings and instructions, delivery type, address if applicable, payment method, and total.
4. IF the message delivery fails, THEN THE system SHALL log the error and confirm the order to the client since it was already persisted.
5. WHEN the order is confirmed successfully, THE system SHALL show a confirmation screen with the order summary and reference number.

### Requirement 7: Order Submission Rules

**User Story:** As a system operator, I want order submissions to be validated and rate-limited, so that the system remains reliable.

#### Acceptance Criteria

1. THE system SHALL allow unauthenticated clients to submit orders using only the restaurant slug for identification.
2. THE system SHALL apply rate limiting on order submissions to prevent abuse.
3. THE system SHALL return paginated responses for list queries.
4. WHEN the client submits an order, THE system SHALL validate that all referenced products belong to the restaurant identified by the slug.
5. IF validation fails, THEN THE system SHALL reject the order with a descriptive error message.

### Requirement 8: Order Tracking Page

**User Story:** As a client, I want to tap my order reference number and see a page with the full order details and current status, so that I can track my order from any device.

#### Acceptance Criteria

1. WHEN the order is confirmed, THE system SHALL display the reference number as a clickable link on the confirmation screen.
2. WHEN the client taps the reference number link, THE system SHALL navigate to a dedicated order tracking page.
3. THE order tracking page SHALL display: reference number, order status, item list with toppings and special instructions, delivery type, address (if delivery), payment method, subtotal, delivery fee (if applicable), and total.
4. THE order tracking page SHALL display the current order status with a visual indicator (e.g. progress steps or color-coded badge).
5. THE order tracking page SHALL be responsive and usable on both mobile phones and desktop computers.
6. THE order tracking page SHALL be accessible without authentication using only the reference number in the URL.
7. IF the reference number does not exist, THEN THE system SHALL display an error message indicating the order was not found.


### Requirement 9: Operating Hours Restriction

**User Story:** As a client, I want to know when a restaurant is outside its operating hours, so that I don't place orders that won't be fulfilled.

#### Acceptance Criteria

1. WHEN the client accesses the menu and the restaurant is outside its operating hours, THE system SHALL display a "Sin servicio" badge in red in the restaurant header area (next to the logo, name, and address).
2. WHEN the restaurant is outside operating hours, THE system SHALL disable the "Pagar" (Pay) button, preventing the client from advancing to the checkout flow.
3. THE system SHALL allow the client to continue browsing the menu (viewing products and adding to cart) even when the restaurant is closed.
4. THE system SHALL re-evaluate the operating hours status periodically (at least every 60 seconds) without requiring a page refresh.
5. WHEN the restaurant is outside operating hours and the client has items in the cart, THE system SHALL display an explanatory message below the order bar indicating that orders cannot be placed at this time.
6. THE backend SHALL reject order creation attempts outside operating hours with a descriptive error message, as a secondary safeguard in case the frontend restriction is bypassed.
7. IF the restaurant has no operating hours configured, THEN THE system SHALL treat it as always open and impose no restriction.
