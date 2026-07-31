# Requirements Document

## Introduction

The restaurant-admin module provides restaurant owners with tools to configure their restaurant profile (generate a unique slug identifier, upload images), manage their menu (categories, products, toppings), and view order history.

## Glossary

- **Restaurant**: Business entity identified by a unique slug that uses the system to manage its menu and receive orders.
- **Slug**: Unique, short, immutable identifier associated with a restaurant.
- **Product**: Menu item belonging to a category with name, description, photo, base price, and optional toppings.
- **Management Panel**: Frontend section restricted to the restaurant for administering its menu and configuration.

## Requirements

### Requirement 1: Restaurant Profile Configuration

**User Story:** As a restaurant owner, I want to register and log in from the frontend, so that I can manage my restaurant without needing backend admin access.

#### Acceptance Criteria

1. THE system SHALL provide a registration form with fields: owner name, email, password, and restaurant name.
2. WHEN the owner submits the registration form, THE system SHALL create the owner account and the restaurant record, and SHALL auto-generate a unique slug based on the restaurant name.
3. THE system SHALL provide a login form with email and password fields.
4. WHEN the owner logs in successfully, THE system SHALL authenticate the session and grant access to the management panel.
5. WHILE the owner's session is active, THE system SHALL maintain authentication and automatically renew it without requiring re-login.
6. IF the session has fully expired, THEN THE system SHALL redirect the owner to the login page.

### Requirement 2: Restaurant Profile Configuration

**User Story:** As a restaurant owner, I want to configure my restaurant's profile, so that clients see accurate information.

#### Acceptance Criteria

1. THE system SHALL identify each restaurant by a unique and immutable slug.
2. THE management panel SHALL display the restaurant's slug as a read-only field in the settings page, so the owner can copy and share the public URL.
3. THE management panel SHALL allow editing: name, logo, address, phone number, payment methods, notification channel, and delivery fee.
4. IF a user without restaurant owner role attempts to modify the data, THEN THE system SHALL reject the request.
5. THE management panel SHALL allow the owner to set the restaurant's geographic coordinates by selecting a location on a mini map.
6. WHEN the owner selects a location on the mini map, THE system SHALL store the latitude and longitude and display the selected point on the map.
7. THE system SHALL display the restaurant's location on a mini map in the client-facing views when coordinates are configured (e.g. pickup/dine-in delivery type selection).

### Requirement 2: Menu Management

**User Story:** As a restaurant owner, I want to manage my menu (categories, products, toppings), so offert my products at the users.

#### Acceptance Criteria

1. THE management panel SHALL allow creating, editing, and deleting categories.
2. THE management panel SHALL allow creating, editing, and deleting products, including name, description, photo, base price, and ingredients.
3. THE management panel SHALL allow creating, editing, and deleting toppings associated with products, including name and additional price.

### Requirement 3: Image Configuration

**User Story:** As a restaurant owner, I want to upload and configure images for my restaurant logo and products, so that clients see appealing visuals.

#### Acceptance Criteria

1. THE management panel SHALL allow uploading a restaurant logo image.
2. THE management panel SHALL allow uploading a photo for each product.
3. THE frontend SHALL display uploaded images in the menu and restaurant profile.

### Requirement 4: Order History

**User Story:** As a restaurant owner, I want to view the history of orders received and the state of thisone, so that I can track sales and review past orders.

#### Acceptance Criteria

1. THE management panel SHALL display a list of past orders for the restaurant.
2. THE order history SHALL show: reference number, date and hour, items summary, total, delivery type, and state.
3. THE management panel SHALL allow filtering order history by date range and state.

### Requirement 5: Product Highlight Labels

**User Story:** As a restaurant owner, I want to assign a highlight label to a specific product (e.g. "Más vendido", "Nuevo"), so that I can draw attention to it in the menu without duplicating it.

#### Acceptance Criteria

1. THE management panel SHALL allow the owner to set an optional highlight label on a product.
2. THE management panel SHALL allow the owner to remove a product's highlight label.
3. THE frontend SHALL display the highlight label on the product card in the client-facing menu when set.
4. A product SHALL appear only once in its category regardless of whether it has a highlight label.


### Requirement 6: Operating Hours Configuration

**User Story:** As a restaurant owner, I want to configure my restaurant's operating hours by day of week, so that clients cannot place orders outside of business hours.

#### Acceptance Criteria

1. THE management panel SHALL display a schedule configuration section in the settings page with all seven days of the week.
2. THE system SHALL allow the owner to enable or disable each day individually (disabled days mean the restaurant is closed).
3. FOR each enabled day, THE system SHALL allow setting an opening time and a closing time.
4. WHEN the owner saves the schedule, THE system SHALL persist it and use it to restrict order placement.
5. IF no schedule is configured (zero days enabled), THEN THE system SHALL treat the restaurant as always open (no restriction).
6. THE system SHALL support overnight schedules where the closing time is earlier than the opening time (e.g. open at 17:00 and close at 03:00 the next day). In this case, the restaurant is considered open from the opening time until midnight, and from midnight until the closing time the following day.
7. WHEN evaluating if the restaurant is currently open, THE system SHALL check both the current day's schedule AND the previous day's schedule (in case the previous day's shift extends past midnight into today).


### Requirement 7: Logout

**User Story:** As a restaurant owner, I want a logout button visible in the management panel, so that I can close my session securely.

#### Acceptance Criteria

1. THE management panel SHALL display a "Cerrar sesión" button accessible from any page within the admin section.
2. WHEN the owner presses "Cerrar sesión", THE system SHALL clear the stored tokens (access and refresh) and redirect to the login page.
3. AFTER logout, THE system SHALL NOT allow access to any protected admin page until the owner logs in again.
