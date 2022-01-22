import { useMemo } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Header from '../../components/Header';

import { AiOutlineClockCircle, AiOutlineCalendar } from 'react-icons/ai';
import { FiUser } from 'react-icons/fi';

import { Comments } from '../../components/Comments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  previousPost: Post | null;
  nextPost: Post | null;
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost,
}: PostProps) {
  const router = useRouter();

  const amountWordsBody = RichText.asText(
    post.data.content.reduce((acc, data) => [...acc, ...data.body], [])
  ).split(' ');

  const amountWordsHeading = post.data.content.reduce((acc, data) => {
    if (data.heading) {
      return [...acc, ...data.heading.split(' ')];
    }

    return [...acc];
  }, []);

  const readingTime = Math.ceil(
    (amountWordsHeading.length + amountWordsBody.length) / 200
  );

  const isPostEdited = useMemo(() => {
    if (router.isFallback) {
      return false;
    }

    return post.last_publication_date !== post.first_publication_date;
  }, [post, router.isFallback]);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | Space Traveling </title>
      </Head>

      <Header />

      {post.data.banner.url && (
        <section key={post.uid} className={styles.banner}>
          <img src={post.data.banner.url} alt="banner" />
        </section>
      )}

      <main className={commonStyles.container}>
        <article className={styles.main}>
          <h1>{post.data.title}</h1>

          <div className={styles.info}>
            <span>
              <AiOutlineCalendar />
              {post.first_publication_date}
            </span>

            <span>
              <FiUser />
              {post.data.author}
            </span>

            <span>
              <AiOutlineClockCircle />
              {readingTime} min
            </span>

            {isPostEdited && (
              <time>{`* editado em ${post.last_publication_date}`}</time>
            )}
          </div>

          <div className={styles.postContent}>
            {post.data.content.map(({ heading, body }) => (
              <div key={heading}>
                {heading && <h2>{heading}</h2>}

                <div
                  dangerouslySetInnerHTML={{ __html: RichText.asHtml(body) }}
                />
              </div>
            ))}
          </div>
        </article>
      </main>

      <div className={styles.separator}></div>

      <footer className={commonStyles.container}>
        <div className={styles.neighborLinks}>
          {previousPost && (
            <div>
              {previousPost.data.title}

              <Link href={`/post/${previousPost.uid}`}>
                <a>Post anterior</a>
              </Link>
            </div>
          )}

          {nextPost && (
            <div className={!previousPost ? styles.moveToRight : ''}>
              {nextPost.data.title}

              <Link href={`/post/${nextPost.uid}`}>
                <a>Próximo post</a>
              </Link>
            </div>
          )}
        </div>

        <Comments />

        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const post: Post = {
    uid: response.uid,
    first_publication_date: String(
      format(new Date(response.first_publication_date), 'dd MMM yyyy', {
        locale: ptBR,
      })
    ),
    last_publication_date: String(
      format(
        new Date(response.last_publication_date),
        "dd MMM yyyy, 'às' kk:mm",
        {
          locale: ptBR,
        }
      )
    ),
    data: {
      author: response.data.author,
      banner: response.data.banner,
      content: response.data.content,
      title: response.data.title,
    },
  };

  // Verify the neighbor posts
  const postIndex = posts.results.findIndex(slug => slug.uid === post.uid);
  const postLength = posts.results.length;
  const previousPost = postIndex - 1 >= 0 ? posts.results[postIndex - 1] : null;
  const nextPost =
    postIndex + 1 <= postLength - 1 ? posts.results[postIndex + 1] : null;

  return {
    props: {
      post,
      preview,
      previousPost,
      nextPost,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
