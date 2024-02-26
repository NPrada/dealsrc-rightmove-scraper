import { AbstractEntity } from "../components/entity";
import { State } from "../components/event-log";

class PropertyListingEntity extends AbstractEntity {
  keyFields: string[];
  name: string;
  fields = [
    "id",
    "bedrooms",
    "bathrooms",
    "number_of_images",
    "summary",
    "display_address",
    "postcode_area",
    "country_code",
    "latitude",
    "longitude",
    "property_images",
    "property_sub_type",
    "listing_update_reason",
    "listing_update_date",
    "price_amount",
    "price_frequency",
    "currency_code",
    "display_price",
    "display_price_qualifier",
    "branch_id",
    "branch_display_name",
    "branch_name",
    "branch_landing_page_url",
    "development",
    "commercial",
    "transaction_type",
    "product_label_text",
    "spotlight_label",
    "residential",
    "students",
    "auction",
    "fees_apply",
    "fees_apply_text",
    "display_size",
    "property_url",
    "channel",
    "listing_date",
    "added_or_reduced",
    "property_type_full_description",
  ] as const;

  constructor(name: "rightmove_property_listing" | "rightmove_rental_listing") {
    super();
    this.name = name;
    this.keyFields = ["id"];
  }
}

export const propertyListingEntity = new PropertyListingEntity(
  "rightmove_property_listing"
);
export const rentalListingEntity = new PropertyListingEntity(
  "rightmove_rental_listing"
);
