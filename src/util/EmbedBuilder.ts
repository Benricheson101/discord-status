export class EmbedBuilder {
  title?: string;
  type?: 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link';
  description?: string;
  url?: string;
  timestamp?: Date;
  color?: number;
  footer?: {text: string; icon_url?: string; proxy_icon_url?: string};
  image?: {url?: string; proxy_url?: string; height?: number; width?: number};
  thumbnail?: {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {url?: string; height?: number; width?: number};
  provider?: {name?: string; url?: string};
  author?: {
    name?: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: {name: string; value: string; inline?: boolean}[] = [];

  constructor(embed?: EmbedJSON) {
    if (embed) {
      Object.assign(this, embed);
    }
  }

  setTitle(title: string): EmbedBuilder {
    this.title = title;
    return this;
  }

  setDescription(description: string): EmbedBuilder {
    this.description = description;
    return this;
  }

  setURL(url: string): EmbedBuilder {
    this.url = url;
    return this;
  }

  setTimestamp(timestamp: Date | number = new Date()): EmbedBuilder {
    this.timestamp = new Date(timestamp);
    return this;
  }

  setColor(color: string | number): EmbedBuilder {
    this.color =
      typeof color === 'string' ? parseInt(color.replace(/#/g, ''), 16) : color;
    return this;
  }

  setFooter(text: string, icon_url: string): EmbedBuilder {
    this.footer = {text, icon_url};
    return this;
  }

  setImage(url: string): EmbedBuilder {
    this.image = {url};
    return this;
  }

  setThumbnail(url: string): EmbedBuilder {
    this.thumbnail = {url};
    return this;
  }

  setVideo(url: string): EmbedBuilder {
    this.video = {url};
    return this;
  }

  setAuthor(name: string, url: string, icon_url: string): EmbedBuilder {
    this.author = {name, url, icon_url};
    return this;
  }

  addField(name: string, value: string, inline = false): EmbedBuilder {
    this.fields?.push({name, value, inline});
    return this;
  }

  toJSON(): EmbedJSON {
    return this.timestamp
      ? {...this, timestamp: this.timestamp?.getTime()}
      : {...this};
  }
}

export interface EmbedJSON {
  title?: string;
  type?: 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link';
  description?: string;
  url?: string;
  timestamp?: Date;
  color?: number;
  footer?: {text: string; icon_url?: string; proxy_icon_url?: string};
  image?: {url?: string; proxy_url?: string; height?: number; width?: number};
  thumbnail?: {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {url?: string; height?: number; width?: number};
  provider?: {name?: string; url?: string};
  author?: {
    name?: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: {name: string; value: string; inline?: boolean}[];
}
