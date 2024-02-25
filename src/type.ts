export interface PropertyListing {
  id: number;
  bedrooms: number;
  bathrooms: number;
  numberOfImages: number;
  summary: string;
  displayAddress: string;
  countryCode: string;
  location: {
    latitude: number;
    longitude: number;
  };
  propertyImages: string; // Assuming you will stringify the JSON
  propertySubType: string;
  listingUpdate: {
    listingUpdateReason: string;
    listingUpdateDate: string; // ISO string for TIMESTAMP WITH TIME ZONE
  };
  price: {
    amount: number;
    frequency: string;
    currencyCode: string;
    displayPrices: Array<{
      displayPrice: string;
      displayPriceQualifier: string;
    }>;
  };
  customer: {
    branchId: number;
    branchDisplayName: string;
    branchName: string;
    branchLandingPageUrl: string;
  };
  development: boolean;
  commercial: boolean;
  transactionType: string;
  productLabel: {
    productLabelText: string;
    spotlightLabel: boolean;
  };
  residential: boolean;
  students: boolean;
  auction: boolean;
  feesApply: boolean;
  feesApplyText: string | null;
  displaySize: string;
  propertyUrl: string;
  channel: string;
  firstVisibleDate: string; // ISO string for TIMESTAMP WITH TIME ZONE
  addedOrReduced: string;
  propertyTypeFullDescription: string;
}