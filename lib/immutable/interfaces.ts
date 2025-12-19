export interface ImxTraitInterface {
  trait_key?: string;
  trait_type: string;
  value: string | Number;
}
export interface ImxMetadataInterfaceObject {
  token_id?: number | string;
  name: string;
  description?: string;
  image: string;
  external_link?: string;
  animation_url?: string;
  youtube_url?: string;
  attributes?: any;
}

export interface ImxMetadataMapInterfaceObject<T extends object> {
  [key: string]: T;
}
