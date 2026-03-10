from enum import StrEnum


class CreateWebKnowledgeSourceRequestBodyType(StrEnum):
    CRAWL = "crawl"
    INDIVIDUAL_LINK = "individual_link"
    SITEMAP = "sitemap"
