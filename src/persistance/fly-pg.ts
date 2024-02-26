import { Pool } from "pg";
import { env } from "../env";
import { parseRightMoveListing } from "../parsing";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Helper function to create a string of placeholders for each object
function createPlaceholders(start: number, count: number) {
  return Array.from({ length: count }, (_, i) => `$${i + start}`).join(", ");
}

// Modified function to handle an array of objects
export async function upsertPropertyListings(
  dataArray: ReturnType<typeof parseRightMoveListing>[],
  type: "BUY" | "RENT"
): Promise<void> {
  // Early exit if dataArray is empty
  if (dataArray.length === 0) return;

  const baseQuery = `
    INSERT INTO rightmove_${
      type === "BUY" ? "property" : "rental"
    }_listings_raw (
      id, bedrooms, bathrooms, number_of_images, summary, display_address, postcode_area,
      country_code, latitude, longitude, property_images, property_sub_type,
      listing_update_reason, listing_update_date, price_amount, price_frequency,
      currency_code, display_price, display_price_qualifier, branch_id,
      branch_display_name, branch_name, branch_landing_page_url, development,
      commercial, transaction_type, product_label_text, spotlight_label,
      residential, students, auction, fees_apply, fees_apply_text, display_size,
      property_url, channel, listing_date, added_or_reduced, property_type_full_description
    ) VALUES
  `;

  // Generate the VALUES part of the query dynamically based on the dataArray length
  const valuesPart = dataArray
    .map((_, index) => `(${createPlaceholders(index * 39 + 1, 39)})`)
    .join(", ");

  const onConflictClause = `
    ON CONFLICT (id) DO UPDATE SET
      bedrooms = EXCLUDED.bedrooms,
      bathrooms = EXCLUDED.bathrooms,
      number_of_images = EXCLUDED.number_of_images,
      summary = EXCLUDED.summary,
      display_address = EXCLUDED.display_address,
      postcode_area = EXCLUDED.postcode_area,
      country_code = EXCLUDED.country_code,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      property_images = EXCLUDED.property_images,
      property_sub_type = EXCLUDED.property_sub_type,
      listing_update_reason = EXCLUDED.listing_update_reason,
      listing_update_date = EXCLUDED.listing_update_date,
      price_amount = EXCLUDED.price_amount,
      price_frequency = EXCLUDED.price_frequency,
      currency_code = EXCLUDED.currency_code,
      display_price = EXCLUDED.display_price,
      display_price_qualifier = EXCLUDED.display_price_qualifier,
      branch_id = EXCLUDED.branch_id,
      branch_display_name = EXCLUDED.branch_display_name,
      branch_name = EXCLUDED.branch_name,
      branch_landing_page_url = EXCLUDED.branch_landing_page_url,
      development = EXCLUDED.development,
      commercial = EXCLUDED.commercial,
      transaction_type = EXCLUDED.transaction_type,
      product_label_text = EXCLUDED.product_label_text,
      spotlight_label = EXCLUDED.spotlight_label,
      residential = EXCLUDED.residential,
      students = EXCLUDED.students,
      auction = EXCLUDED.auction,
      fees_apply = EXCLUDED.fees_apply,
      fees_apply_text = EXCLUDED.fees_apply_text,
      display_size = EXCLUDED.display_size,
      property_url = EXCLUDED.property_url,
      channel = EXCLUDED.channel,
      listing_date = EXCLUDED.listing_date,
      added_or_reduced = EXCLUDED.added_or_reduced,
      property_type_full_description = EXCLUDED.property_type_full_description;
  `;

  // Flatten all data objects into a single array of values
  const values = dataArray.flatMap((obj) => [
    obj.id,
    obj.bedrooms,
    obj.bathrooms,
    obj.number_of_images,
    obj.summary,
    obj.display_address,
    obj.postcode_area,
    obj.country_code,
    obj.latitude,
    obj.longitude,
    obj.property_images,
    obj.property_sub_type,
    obj.listing_update_reason,
    obj.listing_update_date,
    obj.price_amount,
    obj.price_frequency,
    obj.currency_code,
    obj.display_price,
    obj.display_price_qualifier,
    obj.branch_id,
    obj.branch_display_name,
    obj.branch_name,
    obj.branch_landing_page_url,
    obj.development,
    obj.commercial,
    obj.transaction_type,
    obj.product_label_text,
    obj.spotlight_label,
    obj.residential,
    obj.students,
    obj.auction,
    obj.fees_apply,
    obj.fees_apply_text,
    obj.display_size,
    obj.property_url,
    obj.channel,
    obj.listing_date,
    obj.added_or_reduced,
    obj.property_type_full_description,
  ]);

  const finalQuery = baseQuery + valuesPart + onConflictClause;

  try {
    await pool.query(finalQuery, values);
    console.log(
      `📦 Bulk upsert successful, inserted ${dataArray.length} values`
    );
  } catch (err) {
    console.error("Error in bulk upserting property listings", err);
  }
}

function formatDateForPostgres(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}
