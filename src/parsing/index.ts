import { PropertyListing } from "../type";


export function deduplicateListings(listings: ReturnType<typeof parseRightMoveListing>[]): ReturnType<typeof parseRightMoveListing>[] {
  const uniqueListings = new Map<number, ReturnType<typeof parseRightMoveListing>>();

  listings.forEach(listing => {
    uniqueListings.set(listing.id, listing); // This will overwrite any duplicate id with the latest entry
  });

  return Array.from(uniqueListings.values());
}

export function parseRightMoveListing(input: PropertyListing) {
  return {
    id: input.id,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    number_of_images: input.numberOfImages,
    summary: input.summary,
    display_address: input.displayAddress,
    country_code: input.countryCode,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    property_images: JSON.stringify(input.propertyImages),
    property_sub_type: input.propertySubType,
    listing_update_reason: input.listingUpdate.listingUpdateReason,
    listing_update_date: input.listingUpdate.listingUpdateDate,
    price_amount: input.price.amount,
    price_frequency: input.price.frequency,
    currency_code: input.price.currencyCode,
    display_price: input.price.displayPrices[0]?.displayPrice,
    display_price_qualifier: input.price.displayPrices[0]?.displayPriceQualifier,
    branch_id: input.customer.branchId,
    branch_display_name: input.customer.branchDisplayName,
    branch_name: input.customer.branchName,
    branch_landing_page_url: input.customer.branchLandingPageUrl,
    development: input.development,
    commercial: input.commercial,
    transaction_type: input.transactionType,
    product_label_text: input.productLabel.productLabelText,
    spotlight_label: input.productLabel.spotlightLabel,
    residential: input.residential,
    students: input.students,
    auction: input.auction,
    fees_apply: input.feesApply,
    fees_apply_text: input.feesApplyText,
    display_size: input.displaySize,
    property_url: input.propertyUrl,
    channel: input.channel,
    listing_date: input.firstVisibleDate,
    added_or_reduced: input.addedOrReduced,
    property_type_full_description: input.propertyTypeFullDescription,
  };
}
