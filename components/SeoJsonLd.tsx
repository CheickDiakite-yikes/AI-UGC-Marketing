import React from 'react';

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

interface Props {
  data: JsonLdValue;
}

const SeoJsonLd: React.FC<Props> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
};

export default SeoJsonLd;
