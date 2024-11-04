// interfaces.ts
export interface SubTag {
    topic: string;
    tag: string;
    icon?: string;
    subTags: SubTag[];
  }
  
  export interface Item extends SubTag {}
  
  export interface Section {    
    name: string;
    items: Item[];
  }
  
  export interface Configuration {
    [sectionKey: string]: Section;
  }
